import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';
import { PrismaService } from '../prisma.service';
import { Transfer } from '@/common/models/transfer.model';
import { PaginatedData } from '@/common/types';
import { SupportedChains } from '@/modules/blockchain';

@Injectable()
export class TransfersRepository extends BaseRepository<Transfer, 'Transfers'> {
  constructor(prisma: PrismaService) {
    super(prisma, 'Transfers', Transfer);
  }

  /**
   * Bulk upsert transfers (batch operation for better performance)
   * Uses custom upsert logic with unique_transfer constraint
   */
  async bulkUpsert(transfers: Transfer[]): Promise<Transfer[]> {
    // Execute in batches to avoid overwhelming the database
    const batchSize = 100;
    const results: Transfer[] = [];

    for (let i = 0; i < transfers.length; i += batchSize) {
      const batch = transfers.slice(i, i + batchSize);
      const batchResults = await this.upsertMany(batch);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Upsert transfers using the unique_transfer constraint (tx_hash, log_index, chain_id)
   */
  private async upsertMany(transfers: Transfer[]): Promise<Transfer[]> {
    const upsertPromises = transfers.map((transfer) => {
      return this.upsert(transfer);
    });

    const prismaResponse = await Promise.all(upsertPromises);
    return Transfer.hydrateMany<Transfer>(prismaResponse);
  }

  /**
   * Find transfers with pagination and filtering
   */
  async findTransfers(args: {
    skip?: number;
    take?: number;
    where?: Prisma.TransfersWhereInput;
    orderBy?: Prisma.TransfersOrderByWithRelationInput;
  }): Promise<PaginatedData<Transfer>> {
    const { skip = 0, take = 50, where, orderBy } = args;

    const [data, total] = await Promise.all([
      this.findMany({
        skip,
        take,
        where,
        orderBy,
        include: {
          contract: true,
        },
      }),
      this.count({ where }),
    ]);

    const maxPageNumber = Math.ceil(total / take);
    const pageNumber = Math.floor(skip / take) + 1;

    return {
      data: Transfer.hydrateMany<Transfer>(data),
      pagination: {
        total_items: total,
        page_number: pageNumber,
        page_size: take,
        max_page_number: maxPageNumber,
      },
    };
  }

  /**
   * Get transfers by transaction hash
   */
  async getTransferByTxHash(
    txHash: string,
    chainId: SupportedChains,
  ): Promise<Transfer[]> {
    const results = await this.findMany({
      where: {
        tx_hash: txHash,
        chain_id: chainId,
      },
      include: {
        contract: true,
      },
      orderBy: {
        log_index: 'asc',
      },
    });

    return Transfer.hydrateMany<Transfer>(results);
  }

  /**
   * Calculate balance for an address
   * Sum of incoming transfers - Sum of outgoing transfers
   */
  async calculateBalance(
    address: string,
    chainId: SupportedChains,
    contractAddress: string,
  ): Promise<bigint> {
    const normalizedAddress = address.toLowerCase();
    const normalizedContractAddress = contractAddress.toLowerCase();

    // Get sum of incoming transfers (received)
    const incoming = await this.aggregate({
      where: {
        to_address: normalizedAddress,
        chain_id: chainId,
        contract_address: normalizedContractAddress,
        status: 1, // Only successful transfers
      },
      _sum: {
        amount: true,
      },
    });

    // Get sum of outgoing transfers (sent)
    const outgoing = await this.aggregate({
      where: {
        from_address: normalizedAddress,
        chain_id: chainId,
        contract_address: normalizedContractAddress,
        status: 1, // Only successful transfers
      },
      _sum: {
        amount: true,
      },
    });

    const incomingAmount = incoming._sum?.amount || BigInt(0);
    const outgoingAmount = outgoing._sum?.amount || BigInt(0);

    return incomingAmount - outgoingAmount;
  }

  /**
   * Aggregate transfers (for sum, count, avg, etc.)
   */
  async aggregate(args: Prisma.TransfersAggregateArgs) {
    return this.prisma.transfers.aggregate(args);
  }

  /**
   * Delete transfers by block range (useful for reorg handling)
   */
  async deleteByBlockRange(
    chainId: SupportedChains,
    fromBlock: bigint,
    toBlock: bigint,
  ): Promise<number> {
    const result = await this.deleteMany({
      where: {
        chain_id: chainId,
        block_number: {
          gte: fromBlock,
          lte: toBlock,
        },
      },
    });

    return result.count;
  }

  /**
   * Count transfers in a block range (for reorg handling)
   */
  async countTransfersInRange(
    chainId: SupportedChains,
    fromBlock: bigint,
    toBlock: bigint,
  ): Promise<number> {
    return this.count({
      where: {
        chain_id: chainId,
        block_number: {
          gte: fromBlock,
          lte: toBlock,
        },
      },
    });
  }

  /**
   * Delete transfers in a block range (for reorg handling)
   * Alias for deleteByBlockRange with consistent naming
   */
  async deleteTransfersInRange(
    chainId: SupportedChains,
    fromBlock: bigint,
    toBlock: bigint,
  ): Promise<number> {
    return this.deleteByBlockRange(chainId, fromBlock, toBlock);
  }

  /**
   * Get stored block hash for a specific block
   * Used for reorg detection
   */
  async getStoredBlockHash(
    chainId: SupportedChains,
    blockNumber: bigint,
  ): Promise<string | null> {
    const transfer = await this.prisma.transfers.findFirst({
      where: {
        chain_id: chainId,
        block_number: blockNumber,
      },
      select: {
        block_hash: true,
      },
    });

    return transfer?.block_hash || null;
  }
}
