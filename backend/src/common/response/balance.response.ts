import { ApiProperty } from '@nestjs/swagger';
import { ModelResponse } from './model.response';

export class BalanceResponseClass {
  @ApiProperty({ example: '0x123...', description: 'Address' })
  address: string;

  @ApiProperty({ example: 1, description: 'Chain ID' })
  chainId: number;

  @ApiProperty({ example: '0x123...', description: 'Contract address' })
  contractAddress: string;

  @ApiProperty({ example: '1000000n', description: 'Balance' })
  balance: string;

  @ApiProperty({ example: 6, description: 'Decimals' })
  decimals: number;

  @ApiProperty({ example: '1000000', description: 'Formatted balance' })
  formatted: string;
}

export class BalanceResponse {
  @ApiProperty({
    description: 'Balance instance',
    type: BalanceResponseClass,
    example: BalanceResponseClass,
  })
  declare data: BalanceResponseClass;

  constructor(data: BalanceResponseClass) {
    this.data = data;
  }
}
