import { IsInt, IsString, IsOptional, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import {
  SUPPORTED_VIEM_CHAINS,
  type SupportedChains,
} from '@/modules/blockchain';

export class StartIndexerDto {
  @Type(() => Number)
  @IsInt()
  @IsIn(SUPPORTED_VIEM_CHAINS.map((chain) => chain.id))
  chainId: SupportedChains;

  @IsString()
  contractAddress: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  startBlock?: number;
}

export class StopIndexerDto {
  @Type(() => Number)
  @IsInt()
  @IsIn(SUPPORTED_VIEM_CHAINS.map((chain) => chain.id))
  chainId: SupportedChains;

  @IsString()
  contractAddress: string;
}

export class ResetIndexerDto {
  @Type(() => Number)
  @IsInt()
  @IsIn(SUPPORTED_VIEM_CHAINS.map((chain) => chain.id))
  chainId: SupportedChains;

  @IsString()
  contractAddress: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  blockNumber: number;
}

export class CatchUpIndexerDto {
  @Type(() => Number)
  @IsInt()
  @IsIn(SUPPORTED_VIEM_CHAINS.map((chain) => chain.id))
  chainId: SupportedChains;

  @IsString()
  contractAddress: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  fromBlock: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  toBlock: number;
}
