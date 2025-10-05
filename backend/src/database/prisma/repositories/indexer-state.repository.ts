import { Injectable } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { PrismaService } from '../prisma.service';
import { IndexerState } from '@/common/models';
import { SupportedChains } from '@/modules/blockchain';

@Injectable()
export class IndexerStateRepository extends BaseRepository<
  IndexerState,
  'IndexerState'
> {
  constructor(prisma: PrismaService) {
    super(prisma, 'IndexerState', IndexerState);
  }

  /**
   * Get indexer state by chain ID and contract address
   */
  async getState(
    chainId: SupportedChains,
    contractAddress: string,
  ): Promise<IndexerState | null> {
    const result = await this.prisma.indexerState.findUnique({
      where: {
        unique_indexer_state: {
          chain_id: chainId,
          contract_address: contractAddress.toLowerCase(),
        },
      },
    });

    return result ? IndexerState.hydrate<IndexerState>(result) : null;
  }

  /**
   * Get or create indexer state
   */
  async getOrCreateState(
    chainId: SupportedChains,
    contractAddress: string,
    startBlock: bigint,
  ): Promise<IndexerState> {
    const result = await this.prisma.indexerState.upsert({
      where: {
        unique_indexer_state: {
          chain_id: chainId,
          contract_address: contractAddress.toLowerCase(),
        },
      },
      create: {
        chain_id: chainId,
        contract_address: contractAddress.toLowerCase(),
        last_processed_block: startBlock,
        highest_processed_block: startBlock,
        current_block: startBlock,
        start_block: startBlock,
        status: 'stopped',
        is_catching_up: false,
        error_count: 0,
        transfers_indexed: BigInt(0),
      },
      update: {},
    });

    return IndexerState.hydrate<IndexerState>(result);
  }

  /**
   * Get all indexer states
   */
  async getAllStates(): Promise<IndexerState[]> {
    const results = await this.prisma.indexerState.findMany({
      orderBy: { created_at: 'desc' },
    });

    return IndexerState.hydrateMany<IndexerState>(results);
  }

  /**
   * Update indexer status
   */
  async updateStatus(
    chainId: SupportedChains,
    contractAddress: string,
    status: string,
  ): Promise<IndexerState> {
    const result = await this.prisma.indexerState.update({
      where: {
        unique_indexer_state: {
          chain_id: chainId,
          contract_address: contractAddress.toLowerCase(),
        },
      },
      data: {
        status,
        updated_at: new Date(),
      },
    });

    return IndexerState.hydrate<IndexerState>(result);
  }

  /**
   * Reset indexer state to a specific block
   */
  async resetState(
    chainId: SupportedChains,
    contractAddress: string,
    blockNumber: bigint,
  ): Promise<IndexerState> {
    const result = await this.prisma.indexerState.update({
      where: {
        unique_indexer_state: {
          chain_id: chainId,
          contract_address: contractAddress.toLowerCase(),
        },
      },
      data: {
        last_processed_block: blockNumber,
        current_block: blockNumber,
        start_block: blockNumber,
        error_count: 0,
        last_error: null,
        last_error_at: null,
        status: 'stopped',
        updated_at: new Date(),
      },
    });

    return IndexerState.hydrate<IndexerState>(result);
  }

  /**
   * Update current block number
   */
  async updateCurrentBlock(
    chainId: SupportedChains,
    contractAddress: string,
    currentBlock: bigint,
  ): Promise<void> {
    await this.prisma.indexerState.upsert({
      where: {
        unique_indexer_state: {
          chain_id: chainId,
          contract_address: contractAddress.toLowerCase(),
        },
      },
      create: {
        chain_id: chainId,
        contract_address: contractAddress.toLowerCase(),
        last_processed_block: currentBlock,
        highest_processed_block: currentBlock,
        current_block: currentBlock,
        start_block: currentBlock,
        status: 'stopped',
        is_catching_up: false,
        error_count: 0,
        transfers_indexed: BigInt(0),
      },
      update: {
        current_block: currentBlock,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Update last processed block and increment transfer count
   */
  async updateLastProcessedBlock(
    chainId: SupportedChains,
    contractAddress: string,
    blockNumber: bigint,
    transfersCount: number,
  ): Promise<void> {
    // First, get the current state to check if we should update
    const currentState = await this.getState(chainId, contractAddress);

    if (currentState && currentState.highest_processed_block >= blockNumber) {
      // Skip update if the new block number is not higher than current
      // This prevents backward movement when jobs complete out of order
      return;
    }

    // Use upsert to handle both create and update scenarios
    await this.prisma.indexerState.upsert({
      where: {
        unique_indexer_state: {
          chain_id: chainId,
          contract_address: contractAddress.toLowerCase(),
        },
      },
      create: {
        chain_id: chainId,
        contract_address: contractAddress.toLowerCase(),
        last_processed_block: blockNumber,
        highest_processed_block: blockNumber,
        current_block: blockNumber,
        start_block: blockNumber,
        status: 'running',
        is_catching_up: false,
        error_count: 0,
        transfers_indexed: BigInt(transfersCount),
        last_indexed_at: new Date(),
      },
      update: {
        last_processed_block: blockNumber,
        highest_processed_block: blockNumber,
        transfers_indexed: {
          increment: transfersCount,
        },
        last_indexed_at: new Date(),
        error_count: 0, // Reset error count on success
        updated_at: new Date(),
      },
    });
  }

  /**
   * Record an error
   */
  async recordError(
    chainId: SupportedChains,
    contractAddress: string,
    errorMessage: string,
  ): Promise<void> {
    await this.prisma.indexerState.upsert({
      where: {
        unique_indexer_state: {
          chain_id: chainId,
          contract_address: contractAddress.toLowerCase(),
        },
      },
      create: {
        chain_id: chainId,
        contract_address: contractAddress.toLowerCase(),
        last_processed_block: BigInt(0),
        highest_processed_block: BigInt(0),
        current_block: BigInt(0),
        start_block: BigInt(0),
        status: 'error',
        is_catching_up: false,
        error_count: 1,
        last_error: errorMessage,
        last_error_at: new Date(),
        transfers_indexed: BigInt(0),
      },
      update: {
        error_count: {
          increment: 1,
        },
        last_error: errorMessage,
        last_error_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  /**
   * Calculate blocks per second (throughput metric)
   */
  async calculateBlocksPerSecond(
    chainId: SupportedChains,
    contractAddress: string,
  ): Promise<number> {
    const state = await this.getState(chainId, contractAddress);

    if (!state || !state.last_indexed_at || !state.created_at) {
      return 0;
    }

    const timeDiff =
      (state.last_indexed_at.getTime() - state.created_at.getTime()) / 1000;
    const blockDiff = Number(state.last_processed_block - state.start_block);

    if (timeDiff === 0 || blockDiff === 0) {
      return 0;
    }

    return blockDiff / timeDiff;
  }

  /**
   * Update indexer state with partial data
   */
  async updateState(
    chainId: SupportedChains,
    contractAddress: string,
    data: IndexerState,
  ): Promise<IndexerState> {
    const result = await this.update(data, {
      where: {
        unique_indexer_state: {
          chain_id: chainId,
          contract_address: contractAddress.toLowerCase(),
        },
      },
    });
    return IndexerState.hydrate<IndexerState>(result);
  }
}
