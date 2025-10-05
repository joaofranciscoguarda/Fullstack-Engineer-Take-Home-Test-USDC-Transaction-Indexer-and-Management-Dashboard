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

    // Get block range from blockchain config (single source of truth)
    const blockchainConfig = this.configService.get('blockchain');
    const chainConfig = blockchainConfig?.chains?.[chainId];
    const rpcBlockRange = chainConfig?.providers?.[0]?.blockRange || 50n;

    const configMax = BigInt(
      this.configService.get<number>(
        'MAX_CATCHUP_CHUNK_SIZE',
        Number(rpcBlockRange),
      ),
    );
    return dynamicMax && dynamicMax < configMax ? dynamicMax : configMax;
  }

  reduceMaxChunkSize(chainId: SupportedChains): void {
    const currentMax = this.getMaxChunkSize(chainId);
    const newMax = currentMax / 2n;
    const minChunkSize = BigInt(
      this.configService.get<number>('MIN_CATCHUP_CHUNK_SIZE', 10), // Reduced minimum to 10 blocks
    );

    const finalMax = newMax > minChunkSize ? newMax : minChunkSize;
    this.maxChunkSizePerChain.set(chainId, finalMax);

    this.logger.warn(
      `↓ Chunk size reduced (chain ${chainId}): ${currentMax} → ${finalMax}`,
    );
  }

  increaseMaxChunkSize(chainId: SupportedChains): void {
    const currentMax = this.getMaxChunkSize(chainId);

    // Get block range from blockchain config (single source of truth)
    const blockchainConfig = this.configService.get('blockchain');
    const chainConfig = blockchainConfig?.chains?.[chainId];
    const rpcBlockRange = chainConfig?.providers?.[0]?.blockRange || 50n;

    const configMax = BigInt(
      this.configService.get<number>(
        'MAX_CATCHUP_CHUNK_SIZE',
        Number(rpcBlockRange),
      ),
    );

    if (currentMax >= configMax) return;

    const increase = currentMax / 4n;
    const newMax = currentMax + (increase > 0n ? increase : 10n); // Reduced increment
    const finalMax = newMax > configMax ? configMax : newMax;

    this.maxChunkSizePerChain.set(chainId, finalMax);

    this.logger.log(
      `↑ Chunk size increased (chain ${chainId}): ${currentMax} → ${finalMax}`,
    );
  }

  resetMaxChunkSize(chainId: SupportedChains): void {
    // Get block range from blockchain config (single source of truth)
    const blockchainConfig = this.configService.get('blockchain');
    const chainConfig = blockchainConfig?.chains?.[chainId];
    const rpcBlockRange = chainConfig?.providers?.[0]?.blockRange || 50n;

    const configMax = BigInt(
      this.configService.get<number>(
        'MAX_CATCHUP_CHUNK_SIZE',
        Number(rpcBlockRange),
      ),
    );
    this.maxChunkSizePerChain.delete(chainId);
    this.logger.log(`⟳ Chunk size reset (chain ${chainId}): ${configMax}`);
  }

  calculateOptimalChunkSize(lag: bigint, chainId?: SupportedChains): bigint {
    const minChunkSize = BigInt(
      this.configService.get<number>('MIN_CATCHUP_CHUNK_SIZE', 5), // Minimum 5 blocks for non-real-time
    );

    const maxChunkSize = chainId
      ? this.getMaxChunkSize(chainId)
      : BigInt(this.configService.get<number>('MAX_CATCHUP_CHUNK_SIZE', 50)); // Uses blockchain config as default

    let result: bigint;

    // Handle edge cases and ensure minimum chunk size
    if (lag <= 0n) {
      result = 1n; // If caught up, process 1 block at a time
    } else if (lag === 1n) {
      result = 1n;
    } else if (lag <= 5n) {
      result = 2n;
    } else if (lag <= 20n) {
      result = 5n;
    } else if (lag <= 50n) {
      result = 10n;
    } else if (lag <= 100n) {
      result = 20n;
    } else if (lag <= 500n) {
      result = 50n; // Increased for better performance
    } else {
      result = maxChunkSize; // Up to 100 blocks
    }

    // CRITICAL: Ensure we never return 0 or negative values
    if (result <= 0n) {
      console.error(
        `[CHUNK_ERROR] Calculated chunk size is ${result}, forcing to minimum ${minChunkSize}`,
      );
      result = minChunkSize;
    }

    // For non-real-time situations (lag > 1), ensure minimum chunk size
    if (lag > 1n && result < minChunkSize) {
      console.warn(
        `[CHUNK_WARNING] Chunk size ${result} too small for lag ${lag}, using minimum ${minChunkSize}`,
      );
      result = minChunkSize;
    }

    return result;
  }
}
