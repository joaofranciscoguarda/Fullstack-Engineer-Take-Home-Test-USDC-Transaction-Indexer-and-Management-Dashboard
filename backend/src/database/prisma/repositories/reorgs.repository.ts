import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';
import { PrismaService } from '../prisma.service';
import { Reorg } from '@/common/models';
import { SupportedChains } from '@/modules/blockchain';

@Injectable()
export class ReorgsRepository extends BaseRepository<Reorg, 'Reorgs'> {
  constructor(prisma: PrismaService) {
    super(prisma, 'Reorgs', Reorg);
  }

  /**
   * Get reorgs by chain with limit
   */
  async getReorgsByChain(
    chainId: SupportedChains,
    limit: number = 100,
  ): Promise<Reorg[]> {
    const results = await this.prisma.reorgs.findMany({
      where: {
        chain_id: chainId,
      },
      orderBy: {
        detected_at: 'desc',
      },
      take: limit,
    });

    return Reorg.hydrateMany<Reorg>(results);
  }

  /**
   * Get all pending reorgs (not yet resolved)
   */
  async getPendingReorgs(): Promise<Reorg[]> {
    const results = await this.prisma.reorgs.findMany({
      where: {
        status: {
          in: ['detected', 'processing'],
        },
      },
      orderBy: {
        detected_at: 'asc',
      },
    });

    return Reorg.hydrateMany<Reorg>(results);
  }

  /**
   * Create a reorg record
   */
  async createReorg(reorg: Reorg): Promise<Reorg> {
    return this.create(reorg);
  }

  /**
   * Mark reorg as resolved
   */
  async markReorgResolved(
    reorgId: string,
    transfersAffected: number,
  ): Promise<Reorg> {
    const result = await this.prisma.reorgs.update({
      where: { id: reorgId },
      data: {
        status: 'resolved',
        transfers_affected: transfersAffected,
        resolved_at: new Date(),
      },
    });

    const results = [result];
    return Reorg.hydrateMany<Reorg>(results)[0];
  }

  /**
   * Get recent reorg at a specific block
   */
  async getReorgAtBlock(
    chainId: SupportedChains,
    blockNumber: bigint,
  ): Promise<Reorg | null> {
    const result = await this.prisma.reorgs.findFirst({
      where: {
        chain_id: chainId,
        detected_at_block: blockNumber,
        detected_at: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
        },
      },
      orderBy: {
        detected_at: 'desc',
      },
    });

    if (!result) return null;

    const results = [result];
    return Reorg.hydrateMany<Reorg>(results)[0];
  }
}
