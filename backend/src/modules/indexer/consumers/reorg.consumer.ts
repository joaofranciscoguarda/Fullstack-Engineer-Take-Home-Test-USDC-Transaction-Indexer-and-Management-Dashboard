import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ReorgJobData, QueueService } from '@/modules/queue/queue.service';
import {
  TransfersRepository,
  ReorgsRepository,
  IndexerStateRepository,
} from '@/database/prisma/repositories';
import { Reorg } from '@/common/models';

/**
 * Reorg Consumer - Worker Service for handling blockchain reorganizations
 *
 * Handles blockchain reorgs by:
 * 1. Deleting affected transfers
 * 2. Re-indexing the affected block range
 */
@Processor('reorg-handler', {
  concurrency: 1, // Single concurrency to avoid conflicts
})
export class ReorgConsumer extends WorkerHost {
  private readonly logger = new Logger(ReorgConsumer.name);

  constructor(
    private readonly transfersRepo: TransfersRepository,
    private readonly reorgsRepo: ReorgsRepository,
    private readonly indexerStateRepo: IndexerStateRepository,
    private readonly queueService: QueueService,
  ) {
    super();
  }

  async process(job: Job<ReorgJobData>): Promise<{ transfersDeleted: number }> {
    const { chainId, reorgId, affectedFromBlock, affectedToBlock } = job.data;

    // Convert strings back to bigint
    const fromBlock =
      typeof affectedFromBlock === 'string'
        ? BigInt(affectedFromBlock)
        : affectedFromBlock;
    const toBlock =
      typeof affectedToBlock === 'string'
        ? BigInt(affectedToBlock)
        : affectedToBlock;

    this.logger.warn(
      `Handling reorg: blocks ${fromBlock} to ${toBlock} for chain ${chainId}`,
    );

    const reorg = new Reorg({
      id: reorgId,
      chain_id: chainId,
      detected_at_block: fromBlock,
      reorg_depth: 0,
    });

    try {
      // Update reorg status
      reorg.status = 'processing';
      await this.reorgsRepo.update(reorg);

      // Count affected transfers
      const transfersCount = await this.transfersRepo.countTransfersInRange(
        chainId,
        fromBlock,
        toBlock,
      );

      // Delete affected transfers
      await this.transfersRepo.deleteTransfersInRange(
        chainId,
        fromBlock,
        toBlock,
      );

      this.logger.log(
        `Deleted ${transfersCount} transfers due to reorg in blocks ${fromBlock} to ${toBlock}`,
      );

      // Update reorg record
      reorg.status = 'resolved';
      reorg.resolved_at = new Date();
      reorg.transfers_affected = transfersCount;

      await this.reorgsRepo.update(reorg);

      // Reset indexer state to re-index these blocks
      // Get all contracts for this chain
      const states = await this.indexerStateRepo.getAllStates();
      const affectedStates = states.filter((s) => s.chain_id === chainId);

      for (const state of affectedStates) {
        if (state.last_processed_block >= fromBlock) {
          // Reset to before the reorg
          await this.indexerStateRepo.updateLastProcessedBlock(
            chainId,
            state.contract_address,
            fromBlock - 1n,
            -transfersCount, // Subtract deleted transfers
          );

          // Enqueue re-indexing job
          await this.queueService.addBlockRangeJob(
            {
              chainId,
              contractAddress: state.contract_address,
              fromBlock,
              toBlock,
            },
            { priority: 1 }, // Highest priority
          );
        }
      }

      return { transfersDeleted: transfersCount };
    } catch (error) {
      this.logger.error('Error handling reorg', error.stack);

      // Update reorg status to failed
      reorg.status = 'detected';
      await this.reorgsRepo.update(reorg);

      throw error;
    }
  }

  async onCompleted(job: Job<ReorgJobData>, result: any): Promise<void> {
    this.logger.log(
      `Reorg job ${job.id} completed: deleted ${result.transfersDeleted} transfers`,
    );
  }

  async onFailed(job: Job<ReorgJobData>, error: Error): Promise<void> {
    this.logger.error(`Reorg job ${job.id} failed`, error.stack);
  }
}
