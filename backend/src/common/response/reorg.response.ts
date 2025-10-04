import { ApiProperty } from '@nestjs/swagger';
import { type IReorgResponse } from '@/common/models';
import { ModelResponse, ModelResponseList } from './model.response';
import { PaginationMetadata } from '@/common/types';

export class ReorgResponseClass {
  @ApiProperty({ example: '1', description: 'Model identifier' })
  id: string;

  @ApiProperty({ example: 1, description: 'Chain ID' })
  chain_id: number;

  @ApiProperty({
    example: '12345678',
    description: 'Block where reorg detected',
  })
  detected_at_block: string;

  @ApiProperty({ example: 5, description: 'Reorg depth (blocks affected)' })
  reorg_depth: number;

  @ApiProperty({ example: '0xabc...', description: 'Old block hash' })
  old_block_hash: string;

  @ApiProperty({ example: '0xdef...', description: 'New block hash' })
  new_block_hash: string;

  @ApiProperty({ example: 'resolved', description: 'Reorg status' })
  status: string;

  @ApiProperty({ example: 150, description: 'Transfers affected by reorg' })
  transfers_affected: number;

  @ApiProperty({
    example: '2001-01-01T14:10:00.000Z',
    description: 'Date when reorg was detected',
  })
  detected_at: string;

  @ApiProperty({
    example: '2001-01-01T14:10:00.000Z',
    description: 'Date when reorg was resolved',
    required: false,
  })
  resolved_at?: string;
}

export class ReorgResponse extends ModelResponse {
  @ApiProperty({
    description: 'Reorg instance',
    type: ReorgResponseClass,
    example: ReorgResponseClass,
  })
  declare data: IReorgResponse;

  constructor(data: IReorgResponse, message?: string) {
    super(data, message);
  }

  protected getDefaultMessage(): string {
    return 'Reorg retrieved successfully.';
  }
}

export class ReorgResponseList extends ModelResponseList {
  @ApiProperty({
    description: 'List of reorg instances',
    type: ReorgResponseClass,
    example: ReorgResponseClass,
    isArray: true,
  })
  declare data: IReorgResponse[];

  constructor(
    data: IReorgResponse[],
    paginationMetadata: PaginationMetadata,
    message?: string,
  ) {
    super(data, paginationMetadata, message);
  }

  protected getDefaultMessage(): string {
    return 'Reorgs retrieved successfully.';
  }
}
