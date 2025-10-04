import { BaseModel, IBaseModel } from './base.model';
import { Prisma } from '@prisma/client';
import { ToDatabase, ToResponse } from '@/common/types';
import { ContractResponse } from '@/common/response/contract.response';
import { SupportedChains } from '@/modules/blockchain';

export class Contract
  extends BaseModel<Contract, IContract, 'Contracts', 'string'>
  implements IContract
{
  declare id?: string;
  declare name: string;
  declare symbol: string;
  declare address: string;
  declare chains: SupportedChains[];
  declare decimals: number;
  declare active: boolean;
  declare updated_at?: Date;

  /**
   * Define default response class for Contract
   */
  static defaultResponseClass() {
    return ContractResponse;
  }

  /**
   * Define which fields are arrays for proper hydration
   */
  static getArrayFields(): string[] {
    return ['chains'];
  }

  static getUniqueConstraintFields() {
    return ['address', 'chains'] as const;
  }

  static getUniqueConstraintName() {
    return 'unique_contract_address_chains';
  }
}

// Keep track of whats in the database
Prisma.ContractsScalarFieldEnum;

export interface IContract extends IBaseModel<'string'> {
  id?: string;
  name: string;
  symbol: string;
  address: string;
  chains: SupportedChains[];
  decimals: number;
  active: boolean;
  updated_at?: Date;
}

export type IContractDatabase = ToDatabase<IContract>;
export type IContractResponse = ToResponse<IContract>;
