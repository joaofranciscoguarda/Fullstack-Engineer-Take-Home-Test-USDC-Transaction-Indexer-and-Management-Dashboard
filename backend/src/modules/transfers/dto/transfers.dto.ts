import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsEnum,
  IsDateString,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  SUPPORTED_VIEM_CHAINS,
  type SupportedChains,
} from '@/modules/blockchain';

export class GetTransfersQueryDto {
  @ApiProperty({
    required: false,
    default: 1,
    minimum: 1,
    description: 'Page number for pagination',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    required: false,
    default: 50,
    minimum: 1,
    description: 'Number of items per page',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;

  @ApiProperty({
    required: false,
    description: 'Filter by any address (sender or receiver)',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false, description: 'Filter by sender address' })
  @IsOptional()
  @IsString()
  fromAddress?: string;

  @ApiProperty({ required: false, description: 'Filter by receiver address' })
  @IsOptional()
  @IsString()
  toAddress?: string;

  @ApiProperty({ required: false, description: 'Filter by contract address' })
  @IsOptional()
  @IsString()
  contractAddress?: string;

  @ApiProperty({
    required: false,
    enum: SUPPORTED_VIEM_CHAINS.map((chain) => chain.id),
    description: 'Filter by chain ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn(SUPPORTED_VIEM_CHAINS.map((chain) => chain.id))
  chainId?: SupportedChains;

  @ApiProperty({
    required: false,
    description: 'Filter transfers from this block number',
  })
  @IsOptional()
  @Type(() => Number)
  fromBlock?: number;

  @ApiProperty({
    required: false,
    description: 'Filter transfers to this block number',
  })
  @IsOptional()
  @Type(() => Number)
  toBlock?: number;

  @ApiProperty({
    required: false,
    description: 'Filter transfers from this date (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    required: false,
    description: 'Filter transfers to this date (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    required: false,
    description: 'Filter transfers with minimum amount',
  })
  @IsOptional()
  @IsString()
  minAmount?: string;

  @ApiProperty({
    required: false,
    description: 'Filter transfers with maximum amount',
  })
  @IsOptional()
  @IsString()
  maxAmount?: string;
}

export class GetTransfersByAddressQueryDto {
  @ApiProperty({
    required: false,
    default: 1,
    minimum: 1,
    description: 'Page number for pagination',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    required: false,
    default: 50,
    minimum: 1,
    description: 'Number of items per page',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;

  @ApiProperty({
    required: false,
    enum: SUPPORTED_VIEM_CHAINS.map((chain) => chain.id),
    description: 'Filter by chain ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn(SUPPORTED_VIEM_CHAINS.map((chain) => chain.id))
  chainId?: SupportedChains;

  @ApiProperty({
    required: false,
    description: 'Filter transfers from this date (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    required: false,
    description: 'Filter transfers to this date (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    required: false,
    enum: ['sent', 'received', 'all'],
    default: 'all',
    description: 'Type of transfers to retrieve',
  })
  @IsOptional()
  @IsEnum(['sent', 'received', 'all'])
  type?: 'sent' | 'received' | 'all' = 'all';
}

export class GetBalanceParamsDto {
  @ApiProperty({ description: 'Wallet address to get balance for' })
  @IsString()
  address: string;
}

export class GetBalanceQueryDto {
  @ApiProperty({
    required: false,
    enum: SUPPORTED_VIEM_CHAINS.map((chain) => chain.id),
    description: 'Chain ID (defaults to mainnet)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn(SUPPORTED_VIEM_CHAINS.map((chain) => chain.id))
  chainId?: SupportedChains;

  @ApiProperty({ required: false, description: 'USDC contract address' })
  @IsOptional()
  @IsString()
  contractAddress?: string;
}
