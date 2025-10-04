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
}
