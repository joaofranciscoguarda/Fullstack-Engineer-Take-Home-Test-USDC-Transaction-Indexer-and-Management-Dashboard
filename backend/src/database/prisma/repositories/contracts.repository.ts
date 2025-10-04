import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';
import { PrismaService } from '../prisma.service';
import { Contract } from '@/common/models';
import { SupportedChains } from '@/modules/blockchain';

@Injectable()
export class ContractsRepository extends BaseRepository<Contract, 'Contracts'> {
  constructor(prisma: PrismaService) {
    super(prisma, 'Contracts', Contract);
  }

  /**
   * Get all active contracts
   */
  async getAllActiveContracts(): Promise<Contract[]> {
    const results = await this.prisma.contracts.findMany({
      where: {
        active: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return Contract.hydrateMany<Contract>(results);
  }

  /**
   * Get active contracts for a specific chain
   */
  async getActiveContractsByChain(
    chainId: SupportedChains,
  ): Promise<Contract[]> {
    const results = await this.prisma.contracts.findMany({
      where: {
        active: true,
        chains: {
          has: chainId,
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return Contract.hydrateMany<Contract>(results);
  }

  /**
   * Get contract by address and chain
   */
  async getContractByAddressAndChain(
    address: string,
    chainId: SupportedChains,
  ): Promise<Contract | null> {
    const result = await this.prisma.contracts.findFirst({
      where: {
        address: address.toLowerCase(),
        chains: {
          has: chainId,
        },
      },
    });

    return result ? Contract.hydrateOne<Contract>(result) : null;
  }

  /**
   * Get contract by address (any chain)
   */
  async getContractByAddress(address: string): Promise<Contract | null> {
    const result = await this.prisma.contracts.findFirst({
      where: {
        address: address.toLowerCase(),
      },
    });

    return result ? Contract.hydrateOne<Contract>(result) : null;
  }

  /**
   * Create or update contract
   */
  async createOrUpdate(
    address: string,
    chainId: SupportedChains,
    data: {
      name: string;
      symbol: string;
      decimals: number;
    },
  ): Promise<Contract> {
    // Check if contract exists
    const existing = await this.getContractByAddress(address);

    if (existing) {
      // Update to add chain if not present
      const chains = existing.chains;
      if (!chains.includes(chainId)) {
        const result = await this.prisma.contracts.update({
          where: { id: existing.id },
          data: {
            chains: [...chains, chainId],
          },
        });
        return Contract.hydrateOne<Contract>(result);
      }
      return existing;
    }

    // Create new contract
    const result = await this.prisma.contracts.create({
      data: {
        address: address.toLowerCase(),
        name: data.name,
        symbol: data.symbol,
        decimals: data.decimals,
        chains: [chainId],
        active: true,
      },
    });

    return Contract.hydrateOne<Contract>(result);
  }
}
