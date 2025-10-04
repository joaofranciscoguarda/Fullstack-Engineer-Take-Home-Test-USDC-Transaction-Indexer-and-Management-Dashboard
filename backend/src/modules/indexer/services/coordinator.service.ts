import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  IndexerStateRepository,
  ContractsRepository,
} from '@/database/prisma/repositories';
import { QueueService } from '@/modules/queue';
import {
  BlockchainService,
  ChainConfig,
  SupportedChains,
} from '@/modules/blockchain';
import { IndexerState } from '@/common/models';
import { ReorgDetectionService } from './reorg-detection.service';
import { ChunkSizeManagerService } from './chunk-size-manager.service';
import { ErrorHandlerService } from './error-handler.service';

/** Coordinator - Orchestrates indexing operations and delegates to specialized services */
@Injectable()
export class CoordinatorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CoordinatorService.name);
  private activeIndexers: Map<string, NodeJS.Timeout> = new Map();
  private isLeader = false;
  private leaderCheckInterval?: NodeJS.Timeout;

  constructor(
    private readonly indexerStateRepo: IndexerStateRepository,
    private readonly contractsRepo: ContractsRepository,
    private readonly queueService: QueueService,
    private readonly blockchainService: BlockchainService,
    private readonly configService: ConfigService,
    private readonly reorgDetectionService: ReorgDetectionService,
    private readonly chunkSizeManager: ChunkSizeManagerService,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  async onModuleInit() {
    this.logger.log('Coordinator initializing...');
    await this.startLeaderElection();
  }

  async onModuleDestroy() {
    this.logger.log('Coordinator shutting down...');
    await this.stopAllIndexers();
    if (this.leaderCheckInterval) {
      clearInterval(this.leaderCheckInterval);
    }
  }

  private async startLeaderElection() {
    this.isLeader = true;
    this.logger.log('Leader elected');
    if (this.isLeader) {
      await this.startCoordinating();
    }
  }

  private async startCoordinating() {
    const contracts = await this.contractsRepo.getAllActiveContracts();

    for (const contract of contracts) {
      for (const chainId of contract.chains) {
        const startBlock = this.getStartBlockForChain(chainId);
        const state = await this.indexerStateRepo.getOrCreateState(
          chainId,
          contract.address,
          startBlock,
        );

        if (state.status === 'running') {
          await this.startIndexer(chainId, contract.address);
        }
      }
    }
  }

  async resetIndexerState(
    chainId: SupportedChains,
    contractAddress: string,
    newStartBlock: bigint,
  ): Promise<void> {
    this.logger.log(
      `Resetting indexer (chain ${chainId}, block ${newStartBlock})`,
    );

    await this.stopIndexer(chainId, contractAddress);
    await this.indexerStateRepo.resetState(
      chainId,
      contractAddress,
      newStartBlock,
    );

    this.logger.log(`Reset complete`);
  }

  async startIndexer(
    chainId: SupportedChains,
    contractAddress: string,
    startBlock?: bigint,
  ): Promise<void> {
    const key = `${chainId}-${contractAddress}`;

    if (this.activeIndexers.has(key)) {
      this.logger.warn(`Indexer already running: ${key}`);
      return;
    }

    if (this.errorHandler.isShutdownRequested()) {
      throw new Error('Indexer shutdown due to excessive errors');
    }

    const defaultStartBlock = startBlock || this.getStartBlockForChain(chainId);
    let state = await this.indexerStateRepo.getOrCreateState(
      chainId,
      contractAddress,
      defaultStartBlock,
    );

    if (startBlock !== undefined) {
      state = await this.indexerStateRepo.resetState(
        chainId,
        contractAddress,
        startBlock,
      );
    }

    await this.queueService.resumeQueue('block-ranges');
    await this.queueService.resumeQueue('catchup');

    await this.indexerStateRepo.updateStatus(
      chainId,
      contractAddress,
      'running',
    );

    const interval = this.startPolling(chainId, contractAddress);
    this.activeIndexers.set(key, interval);

    this.logger.log(`✓ Started indexer: chain ${chainId}`);
  }

  async stopIndexer(
    chainId: SupportedChains,
    contractAddress: string,
  ): Promise<void> {
    const key = `${chainId}-${contractAddress}`;

    const interval = this.activeIndexers.get(key);
    if (interval) {
      clearInterval(interval);
      this.activeIndexers.delete(key);
    }

    await this.queueService.pauseQueue('block-ranges');
    await this.queueService.pauseQueue('catchup');

    await this.indexerStateRepo.updateStatus(
      chainId,
      contractAddress,
      'stopped',
    );

    this.logger.log(`✓ Stopped indexer: chain ${chainId}`);
  }

  async stopAllIndexers(): Promise<void> {
    const keys = Array.from(this.activeIndexers.keys());

    for (const key of keys) {
      const [chainId, contractAddress] = key.split('-');
      await this.stopIndexer(
        parseInt(chainId) as SupportedChains,
        contractAddress,
      );
    }
  }

  private startPolling(
    chainId: SupportedChains,
    contractAddress: string,
  ): NodeJS.Timeout {
    const pollingInterval = this.configService.get<number>(
      'INDEXER_POLLING_INTERVAL',
      5000,
    );

    const interval = setInterval(async () => {
      try {
        await this.processNewBlocks(chainId, contractAddress);
      } catch (error) {
        await this.errorHandler.handleError(error, chainId, contractAddress);
      }
    }, pollingInterval);

    this.processNewBlocks(chainId, contractAddress).catch((error) => {
      this.logger.error('Initial block processing error', error);
    });

    return interval;
  }

  private async processNewBlocks(
    chainId: SupportedChains,
    contractAddress: string,
  ): Promise<void> {
    const state = await this.indexerStateRepo.getState(
      chainId,
      contractAddress,
    );

    if (!state || state.status !== 'running') return;

    // Check circuit breaker
    if (this.errorHandler.checkCircuitBreaker()) {
      return;
    }

    this.blockchainService.switchChain(chainId);

    let currentBlock: bigint;
    try {
      currentBlock = await this.blockchainService.getBlockNumber();
    } catch (error) {
      this.errorHandler.openCircuitBreaker();
      throw error;
    }

    await this.indexerStateRepo.updateCurrentBlock(
      chainId,
      contractAddress,
      currentBlock,
    );

    const lag = currentBlock - state.last_processed_block;
    const realTimeThreshold = BigInt(
      this.configService.get<number>('REALTIME_THRESHOLD', 1),
    );
    const catchUpThreshold = BigInt(
      this.configService.get<number>('CATCHUP_THRESHOLD', 50),
    );

    const optimalChunkSize = this.chunkSizeManager.calculateOptimalChunkSize(
      lag,
      chainId,
    );

    // Check if there are pending jobs before triggering new catch-up
    const pendingJobs = await this.queueService.getQueueMetrics();
    const hasPendingBlockRanges =
      pendingJobs.blockRanges.waiting > 0 || pendingJobs.blockRanges.active > 0;

    if (lag <= realTimeThreshold) {
      await this.processBlockRange(
        chainId,
        contractAddress,
        state.last_processed_block + 1n,
        state.last_processed_block + 1n,
        10,
        'Real-time',
      );
    } else if (
      lag > catchUpThreshold &&
      !state.is_catching_up &&
      !hasPendingBlockRanges
    ) {
      await this.startDynamicCatchUp(
        chainId,
        contractAddress,
        state.last_processed_block,
        currentBlock,
        optimalChunkSize,
      );
      return;
    } else {
      const nextBlock = state.last_processed_block + 1n;
      const toBlock =
        nextBlock + optimalChunkSize < currentBlock
          ? nextBlock + optimalChunkSize
          : currentBlock;

      await this.processBlockRange(
        chainId,
        contractAddress,
        nextBlock,
        toBlock,
        5,
        'Batch',
      );
    }
  }

  async triggerCatchUp(
    chainId: SupportedChains,
    contractAddress: string,
    fromBlock: bigint,
    toBlock: bigint,
  ): Promise<void> {
    const chunkSize = BigInt(
      this.configService.get<number>('CATCHUP_CHUNK_SIZE', 25),
    );

    await this.queueService.addCatchupJob({
      chainId,
      contractAddress,
      fromBlock,
      toBlock,
      chunkSize,
    });

    this.logger.log(`Catch-up triggered: ${fromBlock}-${toBlock}`);
  }

  async resetIndexer(
    chainId: SupportedChains,
    contractAddress: string,
    blockNumber: bigint,
  ): Promise<void> {
    await this.stopIndexer(chainId, contractAddress);
    await this.indexerStateRepo.resetState(
      chainId,
      contractAddress,
      blockNumber,
    );

    this.logger.log(`Reset to block ${blockNumber}`);
  }

  private getStartBlockForChain(chainId: SupportedChains): bigint {
    const blockchainConfig = this.configService.get('blockchain');
    const chainConfig: ChainConfig = blockchainConfig?.chains?.[chainId];

    if (!chainConfig.indexerStartBlock) {
      throw new Error(`No start block configured for chain ${chainId}`);
    }

    return chainConfig.indexerStartBlock;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async healthCheck() {
    if (!this.isLeader) return;

    try {
      const states = await this.indexerStateRepo.getAllStates();

      for (const state of states) {
        if (state.status === 'running' && state.last_indexed_at) {
          const timeSinceLastIndex =
            Date.now() - state.last_indexed_at.getTime();
          const stuckThreshold = 5 * 60 * 1000;

          if (timeSinceLastIndex > stuckThreshold) {
            this.logger.warn(`Indexer stuck: chain ${state.chain_id}`);
          }
        }
      }
    } catch (error) {
      this.logger.error('Health check error', error);
    }
  }

  async resetErrorCounters(): Promise<void> {
    await this.errorHandler.resetErrorCounters();
  }

  // Public methods for external services (block-range.consumer) to call
  public reduceMaxChunkSize(chainId: SupportedChains): void {
    this.chunkSizeManager.reduceMaxChunkSize(chainId);
  }

  public increaseMaxChunkSize(chainId: SupportedChains): void {
    this.chunkSizeManager.increaseMaxChunkSize(chainId);
  }

  public resetMaxChunkSize(chainId: SupportedChains): void {
    this.chunkSizeManager.resetMaxChunkSize(chainId);
  }

  private async startDynamicCatchUp(
    chainId: SupportedChains,
    contractAddress: string,
    fromBlock: bigint,
    toBlock: bigint,
    chunkSize: bigint,
  ): Promise<void> {
    const lag = toBlock - fromBlock;
    this.logger.log(
      `Catch-up mode: ${fromBlock}-${toBlock} (lag: ${lag}, chunk: ${chunkSize})`,
    );

    await this.indexerStateRepo.updateState(
      chainId,
      contractAddress,
      new IndexerState({ is_catching_up: true }),
    );

    await this.queueService.addCatchupJob({
      chainId,
      contractAddress,
      fromBlock,
      toBlock,
      chunkSize,
    });
  }

  private async processBlockRange(
    chainId: SupportedChains,
    contractAddress: string,
    fromBlock: bigint,
    toBlock: bigint,
    priority: number,
    mode: string,
  ): Promise<void> {
    if (fromBlock > toBlock) return;

    // Delegate reorg checking to ReorgDetectionService
    await this.reorgDetectionService.checkForReorg(chainId, fromBlock - 1n);

    await this.queueService.addBlockRangeJob(
      { chainId, contractAddress, fromBlock, toBlock },
      { priority },
    );

    const blockCount = Number(toBlock - fromBlock + 1n);
    if (Number(fromBlock) % 100 === 0) {
      if (blockCount === 1) {
        this.logger.log(`${mode}: block ${fromBlock}`);
      } else {
        this.logger.log(
          `${mode}: blocks ${fromBlock}-${toBlock} (${blockCount})`,
        );
      }
    }
  }
}
