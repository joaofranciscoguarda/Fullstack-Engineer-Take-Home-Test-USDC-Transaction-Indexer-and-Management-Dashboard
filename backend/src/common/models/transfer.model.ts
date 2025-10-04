import { BaseModel, IBaseModel } from './base.model';
import { Prisma } from '@prisma/client';
import { ToDatabase, ToResponse } from '@/common/types';
import { TransferResponse } from '@/common/response/transfer.response';

export class Transfer
  extends BaseModel<Transfer, ITransfer, 'Transfers', 'string'>
  implements ITransfer
{
  declare tx_hash: string;
  declare log_index: number;
  declare block_number: bigint;
  declare block_hash: string;
  declare timestamp: Date;
  declare from_address: string;
  declare to_address: string;
  declare amount: bigint;
  declare contract_id: string;
  declare contract_address: string;
  declare chain_id: number;
  declare gas_price?: bigint | null;
  declare gas_used?: bigint | null;
  declare status: number;
  declare is_confirmed: boolean;
  declare confirmations: number;
  declare updated_at?: Date;

  /**
   * Define default response class for Transfer
   */
  static defaultResponseClass() {
    return TransferResponse;
  }
}

// Keep track of whats in the database
Prisma.TransfersScalarFieldEnum;

export interface ITransfer extends IBaseModel<'string'> {
  tx_hash: string;
  log_index: number;
  block_number: bigint;
  block_hash: string;
  timestamp: Date;
  from_address: string;
  to_address: string;
  amount: bigint;
  contract_id: string;
  contract_address: string;
  chain_id: number;
  gas_price?: bigint | null;
  gas_used?: bigint | null;
  status: number;
  is_confirmed: boolean;
  confirmations: number;
  updated_at?: Date | null;
}

export type ITransferDatabase = ToDatabase<ITransfer>;
export type ITransferResponse = ToResponse<ITransfer>;
