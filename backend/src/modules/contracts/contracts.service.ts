import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { ContractsRepository } from '@/database/prisma/repositories';
import { CreateContractDto } from './dto/contracts.dto';
import { Contract } from '@/common/models';

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(private readonly contractsRepo: ContractsRepository) {}

  async createContract(dto: CreateContractDto) {
    try {
      const contract = await this.contractsRepo.upsert(
        new Contract({
          name: dto.name,
          symbol: dto.symbol,
          address: dto.address.toLowerCase(),
          chains: dto.chains,
          decimals: dto.decimals,
          active: true,
        }),
      );

      this.logger.log(
        `Contract created: ${contract.symbol} at ${contract.address}`,
      );

      return {
        message: 'Contract created successfully',
        contract: {
          id: contract.id,
          name: contract.name,
          symbol: contract.symbol,
          address: contract.address,
          chains: contract.chains,
          decimals: contract.decimals,
          active: contract.active,
        },
      };
    } catch (error) {
      this.logger.error('Error creating contract', error);
      throw new ConflictException('Contract already exists or invalid data');
    }
  }

  async listContracts() {
    const contracts = await this.contractsRepo.getAllActiveContracts();

    return {
      contracts: contracts.map((c) => ({
        id: c.id,
        name: c.name,
        symbol: c.symbol,
        address: c.address,
        chains: c.chains,
        decimals: c.decimals,
        active: c.active,
        created_at: c.created_at,
      })),
      total: contracts.length,
    };
  }
}
