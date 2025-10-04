import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CoordinatorService } from '@/modules/indexer';
import {
  IndexerStateRepository,
  ReorgsRepository,
} from '@/database/prisma/repositories';
import { QueueService } from '@/modules/queue';
import {
  StartIndexerDto,
  ResetIndexerDto,
  CatchUpIndexerDto,
} from './dto/indexer-management.dto';
import { SupportedChains } from '@/modules/blockchain';

@Injectable()
export class IndexerManagementService {
  private readonly logger = new Logger(IndexerManagementService.name);

  constructor(
    private readonly coordinatorService: CoordinatorService,
    private readonly indexerStateRepo: IndexerStateRepository,
    private readonly reorgsRepo: ReorgsRepository,
    private readonly queueService: QueueService,
  ) {}

  /**
   * Get status of a specific indexer
   */
  async getIndexerStatus(chainId: SupportedChains, contractAddress: string) {
    const state = await this.indexerStateRepo.getState(
      chainId,
      contractAddress,
    );

    if (!state) {
      throw new NotFoundException(
        `Indexer not found for chain ${chainId} and contract ${contractAddress}`,
      );
    }

    const lag = state.current_block - state.last_processed_block;
    const blocksPerSecond =
      await this.indexerStateRepo.calculateBlocksPerSecond(
        chainId,
        contractAddress,
      );

    return {
      chainId: state.chain_id,
      contractAddress: state.contract_address,
      status: state.status,
      lastProcessedBlock: state.last_processed_block.toString(),
      currentBlock: state.current_block.toString(),
      startBlock: state.start_block.toString(),
      lag: lag.toString(),
      blocksPerSecond: blocksPerSecond.toFixed(2),
      transfersIndexed: state.transfers_indexed.toString(),
      errorCount: state.error_count,
      lastError: state.last_error,
      lastErrorAt: state.last_error_at,
      isCatchingUp: state.is_catching_up,
      lastIndexedAt: state.last_indexed_at,
    };
  }

  /**
   * Get all indexer statuses
   */
  async getAllIndexerStatuses() {
    const states = await this.indexerStateRepo.getAllStates();

    const statuses = await Promise.all(
      states.map(async (state) => {
        const lag = state.current_block - state.last_processed_block;
        const blocksPerSecond =
          await this.indexerStateRepo.calculateBlocksPerSecond(
            state.chain_id,
            state.contract_address,
          );

        return {
          chainId: state.chain_id,
          contractAddress: state.contract_address,
          status: state.status,
          lastProcessedBlock: state.last_processed_block.toString(),
          currentBlock: state.current_block.toString(),
          lag: lag.toString(),
          blocksPerSecond: blocksPerSecond.toFixed(2),
          transfersIndexed: state.transfers_indexed.toString(),
          errorCount: state.error_count,
          isCatchingUp: state.is_catching_up,
          lastIndexedAt: state.last_indexed_at,
        };
      }),
    );

    return {
      indexers: statuses,
      total: statuses.length,
    };
  }

  /**
   * Start an indexer
   */
  async startIndexer(dto: StartIndexerDto) {
    const { chainId, contractAddress, startBlock } = dto;

    const start = startBlock ? BigInt(startBlock) : undefined;

    await this.coordinatorService.startIndexer(chainId, contractAddress, start);

    const status = await this.getIndexerStatus(chainId, contractAddress);

    return {
      message: 'Indexer started successfully',
      status,
    };
  }

  /**
   * Stop an indexer
   */
  async stopIndexer(chainId: SupportedChains, contractAddress: string) {
    await this.coordinatorService.stopIndexer(chainId, contractAddress);

    const status = await this.getIndexerStatus(chainId, contractAddress);

    return {
      message: 'Indexer stopped successfully',
      status,
    };
  }

  /**
   * Reset an indexer to a specific block
   */
  async resetIndexer(dto: ResetIndexerDto) {
    const { chainId, contractAddress, blockNumber } = dto;

    await this.coordinatorService.resetIndexer(
      chainId,
      contractAddress,
      BigInt(blockNumber),
    );

    const status = await this.getIndexerStatus(chainId, contractAddress);

    return {
      message: `Indexer reset to block ${blockNumber}`,
      status,
    };
  }

  /**
   * Get reorgs
   */
  async getReorgs(chainId?: SupportedChains, limit: number = 100) {
    if (chainId) {
      const reorgs = await this.reorgsRepo.getReorgsByChain(chainId, limit);
      return {
        chainId,
        reorgs: reorgs.map((r) => ({
          id: r.id,
          chainId: r.chain_id,
          detectedAtBlock: r.detected_at_block.toString(),
          reorgDepth: r.reorg_depth,
          oldBlockHash: r.old_block_hash,
          newBlockHash: r.new_block_hash,
          status: r.status,
          transfersAffected: r.transfers_affected,
          detectedAt: r.detected_at,
          resolvedAt: r.resolved_at,
        })),
        total: reorgs.length,
      };
    }

    const reorgs = await this.reorgsRepo.getPendingReorgs();
    return {
      reorgs: reorgs.map((r) => ({
        id: r.id,
        chainId: r.chain_id,
        detectedAtBlock: r.detected_at_block.toString(),
        reorgDepth: r.reorg_depth,
        oldBlockHash: r.old_block_hash,
        newBlockHash: r.new_block_hash,
        status: r.status,
        transfersAffected: r.transfers_affected,
        detectedAt: r.detected_at,
        resolvedAt: r.resolved_at,
      })),
      total: reorgs.length,
    };
  }

  /**
   * Trigger catch-up (deprecated - dynamic catch-up is always active)
   */
  async triggerCatchUp(dto: CatchUpIndexerDto) {
    const { chainId, contractAddress } = dto;

    const state = await this.indexerStateRepo.getState(
      chainId,
      contractAddress,
    );

    if (!state) {
      throw new NotFoundException(
        `Indexer not found for chain ${chainId} and contract ${contractAddress}`,
      );
    }

    return {
      message:
        'Indexer already has a dynamic catch-up mechanism. When the indexer detects a lag > 50 blocks, it automatically enters catch-up mode with adaptive chunk sizing.',
      info: 'No manual intervention needed - catch-up happens automatically',
      currentStatus: {
        isCatchingUp: state.is_catching_up,
        lag: (state.current_block - state.last_processed_block).toString(),
        lastProcessedBlock: state.last_processed_block.toString(),
        currentBlock: state.current_block.toString(),
      },
    };
  }

  /**
   * Get queue metrics
   */
  async getQueueMetrics() {
    const metrics = await this.queueService.getQueueMetrics();
    return metrics;
  }
}
