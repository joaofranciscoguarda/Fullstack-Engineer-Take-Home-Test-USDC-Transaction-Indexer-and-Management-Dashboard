import { ApiProperty } from '@nestjs/swagger';
import { type IIndexerStateResponse } from '@/common/models';
import { ModelResponse, ModelResponseList } from './model.response';
import { PaginationMetadata } from '@/common/types';

export class IndexerStateResponseClass {
  @ApiProperty({ example: '1', description: 'Model identifier' })
  id: string;

  @ApiProperty({ example: 1, description: 'Chain ID' })
  chain_id: number;

  @ApiProperty({
    example: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    description: 'Contract address',
  })
  contract_address: string;

  @ApiProperty({ example: '12345678', description: 'Last processed block' })
  last_processed_block: string;

  @ApiProperty({ example: '12345900', description: 'Highest processed block (for debugging)' })
  highest_processed_block: string;

  @ApiProperty({ example: '12345900', description: 'Current blockchain block' })
  current_block: string;

  @ApiProperty({ example: '6082465', description: 'Starting block' })
  start_block: string;

  @ApiProperty({ example: 'running', description: 'Indexer status' })
  status: string;

  @ApiProperty({ example: false, description: 'Is in catch-up mode' })
  is_catching_up: boolean;

  @ApiProperty({ example: 0, description: 'Error count' })
  error_count: number;

  @ApiProperty({
    example: '1000000',
    description: 'Total transfers indexed',
  })
  transfers_indexed: string;

  @ApiProperty({
    example: 10.5,
    description: 'Blocks per second',
    required: false,
  })
  blocks_per_second?: number;

  @ApiProperty({
    example: '2001-01-01T14:10:00.000Z',
    description: 'Last indexing time',
    required: false,
  })
  last_indexed_at?: string;

  @ApiProperty({
    example: '2001-01-01T14:10:00.000Z',
    description: 'Date when the model was created',
  })
  created_at: string;

  @ApiProperty({
    example: '2001-01-01T14:10:00.000Z',
    description: 'Date when the model was updated',
    required: false,
  })
  updated_at?: string;
}

export class IndexerStateResponse extends ModelResponse {
  @ApiProperty({
    description: 'IndexerState instance',
    type: IndexerStateResponseClass,
    example: IndexerStateResponseClass,
  })
  declare data: IIndexerStateResponse;

  constructor(data: IIndexerStateResponse, message?: string) {
    super(data, message);
  }

  protected getDefaultMessage(): string {
    return 'Indexer state retrieved successfully.';
  }
}

export class IndexerStateResponseList extends ModelResponseList {
  @ApiProperty({
    description: 'List of indexer state instances',
    type: IndexerStateResponseClass,
    example: IndexerStateResponseClass,
    isArray: true,
  })
  declare data: IIndexerStateResponse[];

  constructor(
    data: IIndexerStateResponse[],
    paginationMetadata: PaginationMetadata,
    message?: string,
  ) {
    super(data, paginationMetadata, message);
  }

  protected getDefaultMessage(): string {
    return 'Indexer states retrieved successfully.';
  }
}
