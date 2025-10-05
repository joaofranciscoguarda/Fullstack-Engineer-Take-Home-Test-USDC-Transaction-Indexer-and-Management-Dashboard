import { ApiProperty } from '@nestjs/swagger';

export class BalanceHistoryDataPoint {
  @ApiProperty({
    description: 'Timestamp of the data point',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: Date;

  @ApiProperty({
    description: 'Block number at this point',
    example: 18950000,
  })
  block_number: bigint;

  @ApiProperty({
    description: 'Balance at this point in time (in smallest unit)',
    example: '1000000000',
  })
  balance: bigint;

  @ApiProperty({
    description: 'Balance formatted for display',
    example: '1000.00',
  })
  balance_formatted: string;

  @ApiProperty({
    description: 'Transaction hash that caused this balance change',
    example: '0x1234...5678',
  })
  tx_hash: string;

  @ApiProperty({
    description: 'Whether this was incoming or outgoing',
    example: 'incoming',
    enum: ['incoming', 'outgoing'],
  })
  direction: 'incoming' | 'outgoing';

  @ApiProperty({
    description: 'Amount of this transaction',
    example: '50000000',
  })
  amount: bigint;

  constructor(partial: Partial<BalanceHistoryDataPoint>) {
    Object.assign(this, partial);
  }
}

export class BalanceHistoryData {
  @ApiProperty({
    description: 'Address queried',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  address: string;

  @ApiProperty({
    description: 'Current balance',
    example: '1000000000',
  })
  current_balance: bigint;

  @ApiProperty({
    description: 'Current balance formatted',
    example: '1000.00',
  })
  current_balance_formatted: string;

  @ApiProperty({
    description: 'Chain ID',
    example: 1,
  })
  chain_id: number;

  @ApiProperty({
    description: 'Contract address',
    example: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  })
  contract_address: string;

  @ApiProperty({
    description: 'Number of data points',
    example: 100,
  })
  data_points: number;

  @ApiProperty({
    description: 'Balance history data points',
    type: [BalanceHistoryDataPoint],
  })
  history: BalanceHistoryDataPoint[];

  constructor(partial: Partial<BalanceHistoryData>) {
    Object.assign(this, partial);
  }
}

export class BalanceHistoryResponse {
  @ApiProperty({
    description: 'Balance history data',
    type: BalanceHistoryData,
  })
  data: BalanceHistoryData;

  constructor(data: BalanceHistoryData) {
    this.data = data;
  }
}

export class BalanceHistoryResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Balance history data',
    type: BalanceHistoryData,
  })
  data: BalanceHistoryData;

  @ApiProperty({
    description: 'Response timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: string;
}
