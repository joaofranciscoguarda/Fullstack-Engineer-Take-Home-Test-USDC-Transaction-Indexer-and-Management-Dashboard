import { BaseModel, IBaseModel } from './base.model';
import { Prisma } from '@prisma/client';
import { ToDatabase, ToResponse } from '@/common/types';
import { IndexerStateResponse } from '@/common/response/indexer-state.response';
import { SupportedChains } from '@/modules/blockchain';

export class IndexerState
  extends BaseModel<IndexerState, IIndexerState, 'IndexerState', 'string'>
  implements IIndexerState
{
  declare id?: string;
  declare chain_id: SupportedChains;
  declare contract_address: string;
  declare last_processed_block: bigint;
  declare highest_processed_block: bigint;
  declare current_block: bigint;
  declare start_block: bigint;
  declare status: string;
  declare is_catching_up: boolean;
  declare error_count: number;
  declare last_error?: string | null;
  declare last_error_at?: Date | null;
  declare blocks_per_second?: number | null;
  declare transfers_indexed: bigint;
  declare last_indexed_at?: Date | null;
  declare updated_at?: Date;

  /**
   * Define default response class for IndexerState
   */
  static defaultResponseClass() {
    return IndexerStateResponse;
  }

  static getUniqueConstraintFields() {
    return ['chain_id', 'contract_address'] as const;
  }

  static getUniqueConstraintName() {
    return 'unique_indexer_state';
  }
}

// Keep track of whats in the database
Prisma.IndexerStateScalarFieldEnum;

export interface IIndexerState extends IBaseModel<'string'> {
  id?: string;
  chain_id: SupportedChains;
  contract_address: string;
  last_processed_block: bigint;
  highest_processed_block: bigint;
  current_block: bigint;
  start_block: bigint;
  status: string;
  is_catching_up: boolean;
  error_count: number;
  last_error?: string | null;
  last_error_at?: Date | null;
  blocks_per_second?: number | null;
  transfers_indexed: bigint;
  last_indexed_at?: Date | null;
  updated_at?: Date;
}

export type IIndexerStateDatabase = ToDatabase<IIndexerState>;
export type IIndexerStateResponse = ToResponse<IIndexerState>;
