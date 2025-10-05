import { IsInt, IsString, IsOptional, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  SUPPORTED_VIEM_CHAINS,
  type SupportedChains,
} from '@/modules/blockchain';

export class StartIndexerDto {
  @ApiProperty({
    enum: SUPPORTED_VIEM_CHAINS.map((chain) => chain.id),
    description: 'Chain ID to start indexing on',
  })
  @Type(() => Number)
  @IsInt()
  @IsIn(SUPPORTED_VIEM_CHAINS.map((chain) => chain.id))
  chainId: SupportedChains;

  @ApiProperty({
    example: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    description: 'Contract address to index',
  })
  @IsString()
  contractAddress: string;

  @ApiProperty({
    required: false,
    minimum: 0,
    description: 'Starting block number (optional)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  startBlock?: number;
}

export class StopIndexerDto {
  @ApiProperty({
    enum: SUPPORTED_VIEM_CHAINS.map((chain) => chain.id),
    description: 'Chain ID to stop indexing on',
  })
  @Type(() => Number)
  @IsInt()
  @IsIn(SUPPORTED_VIEM_CHAINS.map((chain) => chain.id))
  chainId: SupportedChains;

  @ApiProperty({
    example: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    description: 'Contract address to stop indexing',
  })
  @IsString()
  contractAddress: string;
}

export class ResetIndexerDto {
  @ApiProperty({
    enum: SUPPORTED_VIEM_CHAINS.map((chain) => chain.id),
    description: 'Chain ID to reset indexing on',
  })
  @Type(() => Number)
  @IsInt()
  @IsIn(SUPPORTED_VIEM_CHAINS.map((chain) => chain.id))
  chainId: SupportedChains;

  @ApiProperty({
    example: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    description: 'Contract address to reset indexing',
  })
  @IsString()
  contractAddress: string;

  @ApiProperty({
    minimum: 0,
    description: 'Block number to reset to',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  blockNumber: number;
}

export class CatchUpIndexerDto {
  @ApiProperty({
    enum: SUPPORTED_VIEM_CHAINS.map((chain) => chain.id),
    description: 'Chain ID to catch up indexing on',
  })
  @Type(() => Number)
  @IsInt()
  @IsIn(SUPPORTED_VIEM_CHAINS.map((chain) => chain.id))
  chainId: SupportedChains;

  @ApiProperty({
    example: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    description: 'Contract address to catch up indexing',
  })
  @IsString()
  contractAddress: string;

  @ApiProperty({
    minimum: 0,
    description: 'Starting block number for catch-up',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fromBlock: number;

  @ApiProperty({
    minimum: 0,
    description: 'Ending block number for catch-up',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  toBlock: number;
}
