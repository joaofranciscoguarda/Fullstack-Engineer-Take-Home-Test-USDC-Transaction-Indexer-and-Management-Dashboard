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

  @ApiProperty({
    example: '2021-01-01T00:00:00.000Z',
    description: 'Last updated',
  })
  lastUpdated: string;
}

export class BalanceResponse extends ModelResponse {
  constructor(data: BalanceResponseClass, message?: string) {
    super(data, message);
  }

  protected getDefaultMessage(): string {
    return 'Balance retrieved successfully.';
  }
}

// Swagger-specific response DTO
export class BalanceResponseDto {
  @ApiProperty({ example: true, description: 'Success status' })
  success: boolean;

  @ApiProperty({ example: 'Balance retrieved successfully.' })
  message: string;

  @ApiProperty({
    description: 'Balance instance',
    type: BalanceResponseClass,
    example: {
      address: '0x123...',
      chainId: 1,
      contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      balance: '1000000n',
      decimals: 6,
      formatted: '1000000',
      lastUpdated: '2021-01-01T00:00:00.000Z',
    },
  })
  data: BalanceResponseClass;
}
