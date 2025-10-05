import { ApiProperty } from '@nestjs/swagger';
import { type ITransferResponse } from '@/common/models';
import { ModelResponse, ModelResponseList } from './model.response';
import { type PaginationMetadata } from '@/common/types';

export class PaginationMetadataClass {
  @ApiProperty({ example: 1, description: 'Current page number' })
  page_number: number;

  @ApiProperty({ example: 10, description: 'Number of items per page' })
  page_size: number;

  @ApiProperty({ example: 10, description: 'Maximum page number' })
  max_page_number: number;

  @ApiProperty({ example: 100, description: 'Total number of items' })
  total_items: number;
}

export class TransferResponseClass {
  @ApiProperty({ example: '1', description: 'Model identifier' })
  id: string;

  @ApiProperty({
    example: '0x123...',
    description: 'Transaction hash',
  })
  tx_hash: string;

  @ApiProperty({ example: 0, description: 'Log index in transaction' })
  log_index: number;

  @ApiProperty({ example: '12345678', description: 'Block number' })
  block_number: string;

  @ApiProperty({ example: '0xabc...', description: 'Block hash' })
  block_hash: string;

  @ApiProperty({
    example: '2001-01-01T14:10:00.000Z',
    description: 'Block timestamp',
  })
  timestamp: string;

  @ApiProperty({
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    description: 'Sender address',
  })
  from_address: string;

  @ApiProperty({
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    description: 'Recipient address',
  })
  to_address: string;

  @ApiProperty({ example: '1000000', description: 'Transfer amount' })
  amount: string;

  @ApiProperty({
    example: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    description: 'Contract address',
  })
  contract_address: string;

  @ApiProperty({ example: 1, description: 'Chain ID' })
  chain_id: number;

  @ApiProperty({
    example: '21000000000n',
    description: 'Gas price',
    required: false,
  })
  gas_price?: string;

  @ApiProperty({
    example: '21000n',
    description: 'Gas used',
    required: false,
  })
  gas_used?: string;

  @ApiProperty({ example: 1, description: 'Transaction status (1=success)' })
  status: number;

  @ApiProperty({ example: true, description: 'Transfer is confirmed' })
  is_confirmed: boolean;

  @ApiProperty({ example: 12, description: 'Number of confirmations' })
  confirmations: number;

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

export class TransferResponse extends ModelResponse {
  constructor(data: ITransferResponse, message?: string) {
    super(data, message);
  }

  protected getDefaultMessage(): string {
    return 'Transfer retrieved successfully.';
  }
}

// Swagger-specific response DTO
export class TransferResponseDto {
  @ApiProperty({ example: true, description: 'Success status' })
  success: boolean;

  @ApiProperty({ example: 'Transfer retrieved successfully.' })
  message: string;

  @ApiProperty({
    description: 'Transfer instance',
    type: TransferResponseClass,
    example: {
      id: '1',
      tx_hash: '0x123...',
      log_index: 0,
      block_number: '12345678',
      block_hash: '0xabc...',
      timestamp: '2001-01-01T14:10:00.000Z',
      from_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      to_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      amount: '1000000',
      contract_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      chain_id: 1,
      gas_price: '21000000000n',
      gas_used: '21000n',
      status: 1,
      is_confirmed: true,
      confirmations: 12,
      created_at: '2001-01-01T14:10:00.000Z',
      updated_at: '2001-01-01T14:10:00.000Z',
    },
  })
  data: TransferResponseClass;
}

export class TransferResponseList extends ModelResponseList {
  constructor(
    data: ITransferResponse[],
    paginationMetadata: PaginationMetadata,
    message?: string,
  ) {
    super(data, paginationMetadata, message);
  }

  protected getDefaultMessage(): string {
    return 'Transfers retrieved successfully.';
  }
}

// Swagger-specific response DTO for lists
export class TransferResponseListDto {
  @ApiProperty({ example: true, description: 'Success status' })
  success: boolean;

  @ApiProperty({ example: 'Transfers retrieved successfully.' })
  message: string;

  @ApiProperty({
    description: 'List of transfer instances',
    type: [TransferResponseClass],
    example: [
      {
        id: '1',
        tx_hash: '0x123...',
        log_index: 0,
        block_number: '12345678',
        block_hash: '0xabc...',
        timestamp: '2001-01-01T14:10:00.000Z',
        from_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        to_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        amount: '1000000',
        contract_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        chain_id: 1,
        gas_price: '21000000000n',
        gas_used: '21000n',
        status: 1,
        is_confirmed: true,
        confirmations: 12,
        created_at: '2001-01-01T14:10:00.000Z',
        updated_at: '2001-01-01T14:10:00.000Z',
      },
    ],
  })
  data: TransferResponseClass[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetadataClass,
    example: {
      page_number: 1,
      page_size: 10,
      max_page_number: 10,
      total_items: 100,
    },
  })
  pagination: PaginationMetadataClass;
}
