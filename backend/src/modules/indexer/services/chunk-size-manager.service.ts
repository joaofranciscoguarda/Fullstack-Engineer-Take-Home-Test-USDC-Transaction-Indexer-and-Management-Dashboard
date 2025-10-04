import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupportedChains } from '@/modules/blockchain';

/** Manages adaptive chunk sizing for RPC rate limit handling */
@Injectable()
export class ChunkSizeManagerService {
  private readonly logger = new Logger(ChunkSizeManagerService.name);
  private maxChunkSizePerChain: Map<number, bigint> = new Map();

  constructor(private readonly configService: ConfigService) {}

  getMaxChunkSize(chainId: SupportedChains): bigint {
    const dynamicMax = this.maxChunkSizePerChain.get(chainId);
    const configMax = BigInt(
      this.configService.get<number>('MAX_CATCHUP_CHUNK_SIZE', 1000),
    );
    return dynamicMax && dynamicMax < configMax ? dynamicMax : configMax;
  }

  reduceMaxChunkSize(chainId: SupportedChains): void {
    const currentMax = this.getMaxChunkSize(chainId);
    const newMax = currentMax / 2n;
    const minChunkSize = BigInt(
      this.configService.get<number>('MIN_CATCHUP_CHUNK_SIZE', 50),
    );

    const finalMax = newMax > minChunkSize ? newMax : minChunkSize;
    this.maxChunkSizePerChain.set(chainId, finalMax);

    this.logger.warn(
      `↓ Chunk size reduced (chain ${chainId}): ${currentMax} → ${finalMax}`,
    );
  }

  increaseMaxChunkSize(chainId: SupportedChains): void {
    const currentMax = this.getMaxChunkSize(chainId);
    const configMax = BigInt(
      this.configService.get<number>('MAX_CATCHUP_CHUNK_SIZE', 1000),
    );

    if (currentMax >= configMax) return;

    const increase = currentMax / 4n;
    const newMax = currentMax + (increase > 0n ? increase : 50n);
    const finalMax = newMax > configMax ? configMax : newMax;

    this.maxChunkSizePerChain.set(chainId, finalMax);

    this.logger.log(
      `↑ Chunk size increased (chain ${chainId}): ${currentMax} → ${finalMax}`,
    );
  }

  resetMaxChunkSize(chainId: SupportedChains): void {
    const configMax = BigInt(
      this.configService.get<number>('MAX_CATCHUP_CHUNK_SIZE', 1000),
    );
    this.maxChunkSizePerChain.delete(chainId);
    this.logger.log(`⟳ Chunk size reset (chain ${chainId}): ${configMax}`);
  }

  calculateOptimalChunkSize(lag: bigint, chainId?: SupportedChains): bigint {
    const minChunkSize = BigInt(
      this.configService.get<number>('MIN_CATCHUP_CHUNK_SIZE', 50),
    );

    const maxChunkSize = chainId
      ? this.getMaxChunkSize(chainId)
      : BigInt(this.configService.get<number>('MAX_CATCHUP_CHUNK_SIZE', 1000));

    if (lag <= 1n) return 1n;
    if (lag <= 5n) return 5n;
    if (lag <= 50n) return minChunkSize;
    if (lag <= 500n)
      return BigInt(Math.min(Number(lag) / 2, Number(maxChunkSize)));
    return maxChunkSize;
  }
}
