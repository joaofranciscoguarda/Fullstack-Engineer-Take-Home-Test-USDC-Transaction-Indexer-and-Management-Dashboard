import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bullmq';
import { Log } from 'viem';
import { BlockRangeJobData, QueueService } from '@/modules/queue/queue.service';
import {
  TransfersRepository,
  ContractsRepository,
  IndexerStateRepository,
} from '@/database/prisma/repositories';
import { BlockchainService, SupportedChains } from '@/modules/blockchain';
import { Transfer } from '@/common/models';
import { CoordinatorService } from '../services/coordinator.service';

/** Processes block range jobs and fetches Transfer events */
@Processor('block-ranges', {
  concurrency: parseInt(process.env.BLOCK_RANGE_WORKERS || '6', 10), // Reduced to 1 to avoid overwhelming RPC providers
  stalledInterval: 60000, // Check for stalled jobs every 60s
  maxStalledCount: 2, // More tolerance for rate limiting
})
export class BlockRangeConsumer extends WorkerHost {
  private readonly logger = new Logger(BlockRangeConsumer.name);

  constructor(
    private readonly transfersRepo: TransfersRepository,
    private readonly contractsRepo: ContractsRepository,
    private readonly indexerStateRepo: IndexerStateRepository,
    private readonly blockchainService: BlockchainService,
    private readonly queueService: QueueService,
    @Inject(forwardRef(() => CoordinatorService))
    private readonly coordinatorService: CoordinatorService,
  ) {
    super();
  }

  async process(
    job: Job<BlockRangeJobData>,
  ): Promise<{ transfersProcessed: number; split?: boolean }> {
    const { chainId, contractAddress, fromBlock, toBlock } = job.data;
    const from = typeof fromBlock === 'string' ? BigInt(fromBlock) : fromBlock;
    const to = typeof toBlock === 'string' ? BigInt(toBlock) : toBlock;

    try {
      // Add small delay to prevent rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));

      const transfers = await this.fetchTransferEvents(
        chainId,
        contractAddress,
        from,
        to,
      );

      if (transfers.length > 0) {
        const startTime = Date.now();

        const saved = await this.transfersRepo.bulkUpsert(transfers);

        const saveTime = Date.now() - startTime;
        this.logger.log(
          `✓ Saved ${saved.length} transfers (blocks ${from}-${to}) - contract ${contractAddress} - chain ${chainId} in ${saveTime}ms`,
        );
      } else {
        this.logger.debug(
          `[DEBUG] Job ${job.id}: No transfers found, skipping database save`,
        );
      }

      await this.indexerStateRepo.updateLastProcessedBlock(
        chainId,
        contractAddress,
        to,
        transfers.length,
      );

      await job.updateProgress(100);

      const blockCount = Number(to - from + 1n);
      if (blockCount > 100) {
        this.coordinatorService.increaseMaxChunkSize(chainId);
      }

      return { transfersProcessed: transfers.length };
    } catch (error) {
      const cleanMessage = this.cleanErrorMessage(error.message);

      if (this.isMaxResultsExceededError(error)) {
        this.logger.warn(`⚠ Max results exceeded (blocks ${from}-${to})`);
        this.coordinatorService.reduceMaxChunkSize(chainId);

        try {
          await this.blockchainService.switchToNextProvider();
          this.logger.log(`→ Switched provider`);
        } catch (switchError) {
          this.logger.warn(`Provider switch failed: ${switchError.message}`);
        }

        await this.splitAndRequeueJob(job, from, to, chainId, contractAddress);
        return { transfersProcessed: 0, split: true };
      }

      this.logger.error(
        `✗ Error blocks ${from}-${to}: ${cleanMessage}`,
        this.cleanErrorStack(error.stack),
      );

      await this.indexerStateRepo.recordError(
        chainId,
        contractAddress,
        cleanMessage,
      );
      throw error;
    }
  }

  private isMaxResultsExceededError(error: any): boolean {
    const msg = error?.message || error?.details || '';
    return msg.includes('exceeds max results') || msg.includes('max results');
  }

  private async fetchTransferEvents(
    chainId: SupportedChains,
    contractAddress: string,
    fromBlock: bigint,
    toBlock: bigint,
  ): Promise<Transfer[]> {
    const contract = await this.contractsRepo.getContractByAddressAndChain(
      contractAddress,
      chainId,
    );

    if (!contract) {
      throw new Error(
        `Contract ${contractAddress} not found for chain ${chainId}`,
      );
    }

    const logs = await this.blockchainService.getLogs({
      address: contractAddress as `0x${string}`,
      fromBlock,
      toBlock,
      eventType: {
        type: 'event',
        name: 'Transfer',
        inputs: [
          { indexed: true, name: 'from', type: 'address' },
          { indexed: true, name: 'to', type: 'address' },
          { indexed: false, name: 'value', type: 'uint256' },
        ],
      },
    });

    // Group logs by block to fetch block data efficiently
    const logsByBlock = new Map<bigint, Log[]>();
    for (const log of logs) {
      if (log.blockNumber === null) continue;
      if (!logsByBlock.has(log.blockNumber)) {
        logsByBlock.set(log.blockNumber, []);
      }
      logsByBlock.get(log.blockNumber)!.push(log);
    }

    // Fetch block data for timestamps
    const blockData = new Map<bigint, any>();
    for (const blockNumber of logsByBlock.keys()) {
      try {
        const block = await this.blockchainService.getBlock(blockNumber);
        blockData.set(blockNumber, block);
      } catch (error) {
        const msg = error.message?.toLowerCase() || '';
        if (
          !msg.includes('block not found') &&
          !msg.includes('invalid block')
        ) {
          this.logger.error(`Error fetching block ${blockNumber}`, error);
        }
      }
    }

    // Use the static fromLogs method to parse transfers
    return Transfer.fromLogs(
      logs,
      chainId,
      contractAddress,
      contract.id!,
      blockData,
    );
  }

  private async splitAndRequeueJob(
    originalJob: Job<BlockRangeJobData>,
    from: bigint,
    to: bigint,
    chainId: SupportedChains,
    contractAddress: string,
  ): Promise<void> {
    const blockCount = Number(to - from + 1n);
    const splitSize = Math.max(50, Math.floor(blockCount / 4));

    this.logger.log(`↓ Splitting ${blockCount} blocks → ${splitSize}/chunk`);

    const chunks: Array<{ from: bigint; to: bigint }> = [];
    let currentFrom = from;

    while (currentFrom <= to) {
      const currentTo = BigInt(
        Math.min(Number(currentFrom) + splitSize - 1, Number(to)),
      );
      chunks.push({ from: currentFrom, to: currentTo });
      currentFrom = currentTo + 1n;
    }

    for (const chunk of chunks) {
      await this.queueService.addBlockRangeJob(
        {
          fromBlock: chunk.from,
          toBlock: chunk.to,
          chainId,
          contractAddress,
          priority: originalJob.data.priority,
          retryCount: 0,
        },
        {
          priority: originalJob.data.priority,
          delay: 0,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      );
    }

    this.logger.log(`✓ Split into ${chunks.length} jobs`);
  }

  async onFailed(job: Job<BlockRangeJobData>, error: Error): Promise<void> {
    this.logger.error(`Job ${job.id} failed (${job.attemptsMade} attempts)`);
  }

  async onCompleted(job: Job<BlockRangeJobData>, result: any): Promise<void> {
    if (result.transfersProcessed > 0) {
      this.logger.log(`Job ${job.id}: ${result.transfersProcessed} transfers`);
    }
  }

  private cleanErrorMessage(message: string): string {
    if (!message) return 'Unknown error';
    if (message.includes('<html') || message.includes('<!DOCTYPE')) {
      return 'HTTP error (HTML filtered)';
    }
    if (message.length > 500) {
      return `${message.substring(0, 200)}... (truncated)`;
    }
    if (/HTTP request failed|fetch failed|ECONNRESET|ETIMEDOUT/.test(message)) {
      return `RPC Error: ${message.split('\n')[0]}`;
    }
    return message;
  }

  private cleanErrorStack(stack?: string): string | undefined {
    if (!stack) return undefined;
    if (stack.includes('<html') || stack.includes('<!DOCTYPE')) {
      return 'Stack trace (HTML filtered)';
    }
    if (stack.length > 1000) {
      return `${stack.substring(0, 500)}... (truncated)`;
    }
    return stack;
  }
}
