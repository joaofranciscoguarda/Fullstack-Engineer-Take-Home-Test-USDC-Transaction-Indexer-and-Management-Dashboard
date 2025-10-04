import { BaseModel, IBaseModel } from './base.model';
import { Prisma } from '@prisma/client';
import { ToDatabase, ToResponse } from '@/common/types';
import { ReorgResponse } from '@/common/response/reorg.response';

export class Reorg
  extends BaseModel<Reorg, IReorg, 'Reorgs', 'string'>
  implements IReorg
{
  declare id?: string;
  declare chain_id: number;
  declare detected_at_block: bigint;
  declare reorg_depth: number;
  declare old_block_hash: string;
  declare new_block_hash: string;
  declare status: string;
  declare transfers_affected: number;
  declare detected_at: Date;
  declare resolved_at?: Date | null;

  /**
   * Define default response class for Reorg
   */
  static defaultResponseClass() {
    return ReorgResponse;
  }
}

// Keep track of whats in the database
Prisma.ReorgsScalarFieldEnum;

export interface IReorg extends IBaseModel<'string'> {
  id?: string;
  chain_id: number;
  detected_at_block: bigint;
  reorg_depth: number;
  old_block_hash: string;
  new_block_hash: string;
  status: string;
  transfers_affected: number;
  detected_at: Date;
  resolved_at?: Date | null;
}

export type IReorgDatabase = ToDatabase<IReorg>;
export type IReorgResponse = ToResponse<IReorg>;
