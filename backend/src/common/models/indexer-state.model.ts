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

  fill(data: Partial<IIndexerState>) {
    super.fill(data);
    this.fillProperty(data, 'id');
    this.fillProperty(data, 'chain_id');
    this.fillProperty(data, 'contract_address');
    this.fillProperty(data, 'last_processed_block');
    this.fillProperty(data, 'current_block');
    this.fillProperty(data, 'start_block');
    this.fillProperty(data, 'status');
    this.fillProperty(data, 'is_catching_up');
    this.fillProperty(data, 'error_count');
    this.fillProperty(data, 'last_error');
    this.fillProperty(data, 'last_error_at');
    this.fillProperty(data, 'blocks_per_second');
    this.fillProperty(data, 'transfers_indexed');
    this.fillProperty(data, 'last_indexed_at');
  }

  /**
   * Define default response class for IndexerState
   */
  static defaultResponseClass() {
    return IndexerStateResponse;
  }
}

// Keep track of whats in the database
Prisma.IndexerStateScalarFieldEnum;

export interface IIndexerState extends IBaseModel<'string'> {
  id?: string;
  chain_id: SupportedChains;
  contract_address: string;
  last_processed_block: bigint;
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
