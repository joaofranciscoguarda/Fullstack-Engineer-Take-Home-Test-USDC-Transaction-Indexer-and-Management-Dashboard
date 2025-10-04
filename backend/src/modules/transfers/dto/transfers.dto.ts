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
import {
  SUPPORTED_VIEM_CHAINS,
  type SupportedChains,
} from '@/modules/blockchain';

export class GetTransfersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  fromAddress?: string;

  @IsOptional()
  @IsString()
  toAddress?: string;

  @IsOptional()
  @IsString()
  contractAddress?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn(SUPPORTED_VIEM_CHAINS.map((chain) => chain.id))
  chainId?: SupportedChains;

  @IsOptional()
  @Type(() => Number)
  fromBlock?: number;

  @IsOptional()
  @Type(() => Number)
  toBlock?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  minAmount?: string;

  @IsOptional()
  @IsString()
  maxAmount?: string;
}

export class GetTransfersByAddressQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn(SUPPORTED_VIEM_CHAINS.map((chain) => chain.id))
  chainId?: SupportedChains;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(['sent', 'received', 'all'])
  type?: 'sent' | 'received' | 'all' = 'all';
}

export class GetBalanceParamsDto {
  @IsString()
  address: string;
}

export class GetBalanceQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn(SUPPORTED_VIEM_CHAINS.map((chain) => chain.id))
  chainId?: SupportedChains;

  @IsOptional()
  @IsString()
  contractAddress?: string;
}
