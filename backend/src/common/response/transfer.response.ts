import { ApiProperty } from '@nestjs/swagger';
import { type ITransferResponse } from '@/common/models';
import { ModelResponse, ModelResponseList } from './model.response';
import { PaginationMetadata } from '@/common/types';

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
  @ApiProperty({
    description: 'Transfer instance',
    type: TransferResponseClass,
    example: TransferResponseClass,
  })
  declare data: ITransferResponse;

  constructor(data: ITransferResponse, message?: string) {
    super(data, message);
  }

  protected getDefaultMessage(): string {
    return 'Transfer retrieved successfully.';
  }
}

export class TransferResponseList extends ModelResponseList {
  @ApiProperty({
    description: 'List of transfer instances',
    type: TransferResponseClass,
    example: TransferResponseClass,
    isArray: true,
  })
  declare data: ITransferResponse[];

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
