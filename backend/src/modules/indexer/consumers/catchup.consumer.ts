import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CatchupJobData, QueueService } from '@/modules/queue/queue.service';
import { IndexerStateRepository } from '@/database/prisma/repositories';
import { IndexerState } from '@/common/models';

/**
 * Catchup Consumer - Worker Service for rapid catch-up
 *
 * Processes large block ranges by splitting them into smaller chunks
 */
@Processor('catchup', {
  concurrency: parseInt(process.env.CATCHUP_WORKERS || '2', 10), // Configurable catchup workers
})
export class CatchupConsumer extends WorkerHost {
  private readonly logger = new Logger(CatchupConsumer.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly indexerStateRepo: IndexerStateRepository,
  ) {
    super();
  }

  async process(job: Job<CatchupJobData>): Promise<{ chunksCreated: number }> {
    const { chainId, contractAddress, fromBlock, toBlock, chunkSize } =
      job.data;

    // Convert strings back to bigint
    const from = typeof fromBlock === 'string' ? BigInt(fromBlock) : fromBlock;
    const to = typeof toBlock === 'string' ? BigInt(toBlock) : toBlock;
    const chunk = typeof chunkSize === 'string' ? BigInt(chunkSize) : chunkSize;

    this.logger.log(
      `Starting catch-up: ${from} to ${to} (${to - from} blocks) for chain ${chainId}`,
    );

    try {
      // Split into chunks and enqueue
      let currentBlock = from;
      let chunksCreated = 0;

      while (currentBlock < to) {
        // Use smaller chunks for catch-up to avoid RPC limits
        const catchUpChunkSize = Math.min(Number(chunk), 100); // Max 100 blocks per chunk
        const nextBlock =
          currentBlock + BigInt(catchUpChunkSize) > to
            ? to
            : currentBlock + BigInt(catchUpChunkSize);

        // Enqueue block range job with highest priority for catch-up
        await this.queueService.addBlockRangeJob(
          {
            chainId,
            contractAddress,
            fromBlock: currentBlock,
            toBlock: nextBlock,
          },
          { priority: 1 }, // Highest priority for catch-up (lower number = higher priority)
        );

        chunksCreated++;
        currentBlock = nextBlock + 1n;

        // Update progress
        const progress = Number(((currentBlock - from) * 100n) / (to - from));
        await job.updateProgress(progress);
      }

      this.logger.log(
        `Catch-up complete: created ${chunksCreated} chunk jobs for chain ${chainId}`,
      );

      return { chunksCreated };
    } catch (error) {
      this.logger.error('Error in catch-up processing', error.stack);
      throw error;
    }
  }

  async onCompleted(job: Job<CatchupJobData>, result: any): Promise<void> {
    this.logger.log(
      `Catch-up job ${job.id} completed: created ${result.chunksCreated} chunks`,
    );
  }

  async onFailed(job: Job<CatchupJobData>, error: Error): Promise<void> {
    this.logger.error(`Catch-up job ${job.id} failed`, error.stack);
  }
}
