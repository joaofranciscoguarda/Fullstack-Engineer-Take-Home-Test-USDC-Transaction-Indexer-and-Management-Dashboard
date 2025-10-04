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
  ReorgsRepository,
} from '@/database/prisma/repositories';
import { Contract } from '@/common/models';
import { QueueService } from '@/modules/queue';
import {
  BlockchainService,
  ChainConfig,
  SupportedChains,
} from '@/modules/blockchain';
import { IndexerConfig, IndexerStatus } from '../types/indexer.types';
import { IndexerState } from '@/common/models';

/**
 * Coordinator Service - Head Watcher / Leader
 *
 * Responsibilities:
 * - Watch for new blocks on the blockchain
 * - Detect blockchain reorganizations
 * - Enqueue block range jobs for workers to process
 * - Maintain indexer state
 * - Act as singleton/leader using Redis lock or PG advisory lock
 */
@Injectable()
export class CoordinatorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CoordinatorService.name);
  private activeIndexers: Map<string, NodeJS.Timeout> = new Map();
  private isLeader = false;
  private leaderCheckInterval?: NodeJS.Timeout;

  constructor(
    private readonly indexerStateRepo: IndexerStateRepository,
    private readonly contractsRepo: ContractsRepository,
    private readonly reorgsRepo: ReorgsRepository,
    private readonly queueService: QueueService,
    private readonly blockchainService: BlockchainService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    this.logger.log('Coordinator service initializing...');

    // Start leader election
    await this.startLeaderElection();
  }

  async onModuleDestroy() {
    this.logger.log('Coordinator service shutting down...');
    await this.stopAllIndexers();

    if (this.leaderCheckInterval) {
      clearInterval(this.leaderCheckInterval);
    }
  }

  /**
   * Leader election using database advisory lock
   * In production, use Redis or a proper leader election mechanism
   */
  private async startLeaderElection() {
    // For simplicity, we'll assume single instance is leader
    // In production, implement proper leader election with Redis or PostgreSQL advisory locks
    this.isLeader = true;
    this.logger.log('This instance is the leader');

    // Start coordinating if leader
    if (this.isLeader) {
      await this.startCoordinating();
    }
  }

  /**
   * Start coordinating all active indexers
   */
  private async startCoordinating() {
    this.logger.log('Starting coordination of indexers...');

    // Get all active contracts
    const contracts = await this.contractsRepo.getAllActiveContracts();

    for (const contract of contracts) {
      const chains = contract.chains;

      for (const chainId of chains) {
        // Get or create indexer state
        const startBlock = this.getStartBlockForChain(chainId);
        const state = await this.indexerStateRepo.getOrCreateState(
          chainId,
          contract.address,
          startBlock,
        );

        // Auto-start indexers that were running
        if (state.status === 'running') {
          await this.startIndexer(chainId, contract.address);
        }
      }
    }
  }

  /**
   * Start an indexer for a specific contract on a specific chain
   */
  async startIndexer(
    chainId: SupportedChains,
    contractAddress: string,
    startBlock?: bigint,
  ): Promise<void> {
    const key = `${chainId}-${contractAddress}`;

    if (this.activeIndexers.has(key)) {
      this.logger.warn(`Indexer already running for ${key}`);
      return;
    }

    // Get or create state
    const defaultStartBlock = startBlock || this.getStartBlockForChain(chainId);
    let state = await this.indexerStateRepo.getOrCreateState(
      chainId,
      contractAddress,
      defaultStartBlock,
    );

    // If a specific start block is provided, reset the state
    if (startBlock !== undefined) {
      state = await this.indexerStateRepo.resetState(
        chainId,
        contractAddress,
        startBlock,
      );
    }

    // Update status to running
    await this.indexerStateRepo.updateStatus(
      chainId,
      contractAddress,
      'running',
    );

    // Start polling for new blocks
    const interval = this.startPolling(chainId, contractAddress);
    this.activeIndexers.set(key, interval);

    this.logger.log(
      `Started indexer for chain ${chainId}, contract ${contractAddress}`,
    );
  }

  /**
   * Stop an indexer
   */
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

    await this.indexerStateRepo.updateStatus(
      chainId,
      contractAddress,
      'stopped',
    );

    this.logger.log(
      `Stopped indexer for chain ${chainId}, contract ${contractAddress}`,
    );
  }

  /**
   * Stop all indexers
   */
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

  /**
   * Start polling for new blocks
   */
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
        this.logger.error(
          `Error processing new blocks for chain ${chainId}, contract ${contractAddress}`,
          error,
        );
        await this.indexerStateRepo.recordError(
          chainId,
          contractAddress,
          error.message,
        );
      }
    }, pollingInterval);

    // Run immediately
    this.processNewBlocks(chainId, contractAddress).catch((error) => {
      this.logger.error('Error in initial block processing', error);
    });

    return interval;
  }

  /**
   * Process new blocks - core coordination logic
   */
  private async processNewBlocks(
    chainId: SupportedChains,
    contractAddress: string,
  ): Promise<void> {
    const state = await this.indexerStateRepo.getState(
      chainId,
      contractAddress,
    );

    if (!state || state.status !== 'running') {
      return;
    }

    // Get current blockchain block
    this.blockchainService.switchChain(chainId);

    const currentBlock = await this.blockchainService.getBlockNumber();

    // Update current block in state
    await this.indexerStateRepo.updateCurrentBlock(
      chainId,
      contractAddress,
      currentBlock,
    );

    // Calculate lag
    const lag = currentBlock - state.last_processed_block;

    // If lag is too large, enter catch-up mode
    const catchUpThreshold = BigInt(
      this.configService.get<number>('CATCHUP_THRESHOLD', 1000),
    );

    if (lag > catchUpThreshold && !state.is_catching_up) {
      await this.startCatchUp(
        chainId,
        contractAddress,
        state.last_processed_block,
        currentBlock,
      );
      return;
    }

    // Normal processing: enqueue block ranges
    const blockRange = BigInt(
      this.configService.get<number>('BLOCK_RANGE_SIZE', 100),
    );
    const nextBlock = state.last_processed_block + 1n;
    const toBlock =
      nextBlock + blockRange < currentBlock
        ? nextBlock + blockRange
        : currentBlock;

    if (nextBlock <= currentBlock) {
      // Check for reorg before processing
      await this.checkForReorg(chainId, state.last_processed_block);

      // Enqueue block range job
      await this.queueService.addBlockRangeJob({
        chainId,
        contractAddress,
        fromBlock: nextBlock,
        toBlock,
      });

      this.logger.debug(
        `Enqueued blocks ${nextBlock} to ${toBlock} for chain ${chainId}, contract ${contractAddress}`,
      );
    }
  }

  /**
   * Start catch-up mode for large block ranges
   */
  private async startCatchUp(
    chainId: SupportedChains,
    contractAddress: string,
    fromBlock: bigint,
    toBlock: bigint,
  ): Promise<void> {
    this.logger.log(
      `Starting catch-up mode for chain ${chainId}, contract ${contractAddress}: ${fromBlock} to ${toBlock}`,
    );

    await this.indexerStateRepo.updateState(
      chainId,
      contractAddress,
      new IndexerState({
        is_catching_up: true,
      }),
    );

    const chunkSize = BigInt(
      this.configService.get<number>('CATCHUP_CHUNK_SIZE', 1000),
    );

    await this.queueService.addCatchupJob({
      chainId,
      contractAddress,
      fromBlock,
      toBlock,
      chunkSize,
    });
  }

  /**
   * Check for blockchain reorganization
   */
  private async checkForReorg(
    chainId: SupportedChains,
    lastProcessedBlock: bigint,
  ): Promise<void> {
    // Skip reorg check for very old blocks
    this.blockchainService.switchChain(chainId);
    const currentBlock = await this.blockchainService.getBlockNumber();
    const reorgCheckDepth = BigInt(
      this.configService.get<number>('REORG_CHECK_DEPTH', 10),
    );

    if (currentBlock - lastProcessedBlock > reorgCheckDepth) {
      return;
    }

    // Get block hash from blockchain
    const currentHash =
      await this.blockchainService.getBlock(lastProcessedBlock);

    // Get stored block hash from database
    // This would require storing block hashes in the database
    // For now, we'll implement a basic version

    // TODO: Implement full reorg detection
    // Compare hashes and detect if they differ
  }

  /**
   * Trigger catch-up indexing
   */
  async triggerCatchUp(
    chainId: SupportedChains,
    contractAddress: string,
    fromBlock: bigint,
    toBlock: bigint,
  ): Promise<void> {
    const chunkSize = BigInt(
      this.configService.get<number>('CATCHUP_CHUNK_SIZE', 1000),
    );

    await this.queueService.addCatchupJob({
      chainId,
      contractAddress,
      fromBlock,
      toBlock,
      chunkSize,
    });

    this.logger.log(
      `Triggered catch-up: ${fromBlock} to ${toBlock} for chain ${chainId}`,
    );
  }

  /**
   * Reset indexer to a specific block
   */
  async resetIndexer(
    chainId: SupportedChains,
    contractAddress: string,
    blockNumber: bigint,
  ): Promise<void> {
    // Stop indexer if running
    await this.stopIndexer(chainId, contractAddress);

    // Reset state
    await this.indexerStateRepo.resetState(
      chainId,
      contractAddress,
      blockNumber,
    );

    this.logger.log(
      `Reset indexer to block ${blockNumber} for chain ${chainId}, contract ${contractAddress}`,
    );
  }

  /**
   * Get start block for a chain
   * Reads from blockchain configuration (which supports env var overrides)
   */
  private getStartBlockForChain(chainId: SupportedChains): bigint {
    const blockchainConfig = this.configService.get('blockchain');
    const chainConfig: ChainConfig = blockchainConfig?.chains?.[chainId];

    if (!chainConfig.indexerStartBlock) {
      throw new Error(
        `No default indexer start block configured for chain ${chainId}`,
      );
    }

    // Use configured start block if available, otherwise fall back to block 1
    return chainConfig.indexerStartBlock;
  }

  /**
   * Health check - periodic cleanup and monitoring
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async healthCheck() {
    if (!this.isLeader) return;

    try {
      const states = await this.indexerStateRepo.getAllStates();

      for (const state of states) {
        // Check if indexer is stuck
        if (state.status === 'running' && state.last_indexed_at) {
          const timeSinceLastIndex =
            Date.now() - state.last_indexed_at.getTime();
          const stuckThreshold = 5 * 60 * 1000; // 5 minutes

          if (timeSinceLastIndex > stuckThreshold) {
            this.logger.warn(
              `Indexer appears stuck for chain ${state.chain_id}, contract ${state.contract_address}`,
            );
            // Could implement auto-restart logic here
          }
        }
      }
    } catch (error) {
      this.logger.error('Error in health check', error);
    }
  }
}
