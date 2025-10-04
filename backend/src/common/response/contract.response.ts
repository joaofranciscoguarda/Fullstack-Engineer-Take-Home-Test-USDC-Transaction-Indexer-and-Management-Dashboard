import { ApiProperty } from '@nestjs/swagger';
import { type IContractResponse } from '@/common/models';
import { ModelResponse, ModelResponseList } from './model.response';
import { PaginationMetadata } from '@/common/types';

export class ContractResponseClass {
  @ApiProperty({ example: '1', description: 'Model identifier' })
  id: string;

  @ApiProperty({ example: 'USD Coin', description: 'Contract name' })
  name: string;

  @ApiProperty({ example: 'USDC', description: 'Token symbol' })
  symbol: string;

  @ApiProperty({
    example: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    description: 'Contract address',
  })
  address: string;

  @ApiProperty({
    example: [1, 11155111],
    description: 'Chain IDs',
    isArray: true,
  })
  chains: number[];

  @ApiProperty({ example: 6, description: 'Token decimals' })
  decimals: number;

  @ApiProperty({ example: true, description: 'Contract is active' })
  active: boolean;

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

export class ContractResponse extends ModelResponse {
  @ApiProperty({
    description: 'Contract instance',
    type: ContractResponseClass,
    example: ContractResponseClass,
  })
  declare data: IContractResponse;

  constructor(data: IContractResponse, message?: string) {
    super(data, message);
  }

  protected getDefaultMessage(): string {
    return 'Contract retrieved successfully.';
  }
}

export class ContractResponseList extends ModelResponseList {
  @ApiProperty({
    description: 'List of contract instances',
    type: ContractResponseClass,
    example: ContractResponseClass,
    isArray: true,
  })
  declare data: IContractResponse[];

  constructor(
    data: IContractResponse[],
    paginationMetadata: PaginationMetadata,
    message?: string,
  ) {
    super(data, paginationMetadata, message);
  }

  protected getDefaultMessage(): string {
    return 'Contracts retrieved successfully.';
  }
}
