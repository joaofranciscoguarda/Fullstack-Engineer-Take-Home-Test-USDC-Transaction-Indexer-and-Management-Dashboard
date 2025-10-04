import { Injectable, Logger } from '@nestjs/common';
import { Hash, Address, TransactionReceipt, Chain } from 'viem';
import { SUPPORTED_VIEM_CHAINS, SupportedChains } from '../types';
import {
  BlockchainStrategy,
  BlockchainErrorHandler,
  BlockchainProviderHealth,
} from './blockchain-strategy.interface';

/**
 * Abstract base class for blockchain strategies
 * Provides common functionality and error handling for all blockchain implementations
 */
@Injectable()
export abstract class AbstractBlockchainStrategy
  implements
    BlockchainStrategy,
    BlockchainErrorHandler,
    BlockchainProviderHealth
{
  protected readonly logger = new Logger(this.constructor.name);
  protected currentChainId: SupportedChains;
  protected defaultChainId: SupportedChains;
  protected isInitialized = false;

  constructor() {
    this.defaultChainId = Number(
      process.env.DEFAULT_CHAIN_ID || 1,
    ) as SupportedChains;
    this.currentChainId = this.defaultChainId;
  }

  // Abstract methods that must be implemented by concrete strategies
  abstract initialize(chainId?: SupportedChains): Promise<void>;
  abstract switchChain(chainId: SupportedChains): Promise<void>;
  abstract getCurrentChain(): Promise<Chain>;
  abstract switchProvider(): Promise<void>;

  // Common implementations
  async getCurrentChainId(): Promise<SupportedChains> {
    return this.currentChainId;
  }

  isChainSupported(chainId: SupportedChains): boolean {
    return SUPPORTED_VIEM_CHAINS.some((chain) => chain.id === chainId);
  }

  // Error handling with retry logic
  isRetryableError(error: Error): boolean {
    const errorString = error.message.toLowerCase();
    const retryablePatterns = [
      // Network errors
      /network/i,
      /timeout/i,
      /connection/i,
      /socket/i,

      // Rate limiting
      /rate limit/i,
      /too many requests/i,
      /quota exceeded/i,

      // Server errors
      /server error/i,
      /internal error/i,
      /service unavailable/i,
      /bad gateway/i,

      // RPC errors
      /rpc.*error/i,
      /json.*rpc/i,

      // Blockchain specific
      /nonce too low/i,
      /gas price too low/i,
      /transaction underpriced/i,
      /block not found/i,
      /pending transaction/i,

      // Temporary failures
      /temporary/i,
      /try again/i,
      /retry/i,
    ];

    return retryablePatterns.some((pattern) => pattern.test(errorString));
  }

  shouldChangeProvider(error: Error): boolean {
    const errorString = error.message.toLowerCase();
    const err = this.parseError(error);
    const status = err.status || err.code;

    // HTTP status codes that indicate provider issues
    if (typeof status === 'number') {
      // Rate limiting
      if (status === 429) {
        this.logger.warn(
          `Rate limit reached with provider: ${this.getProviderName()}`,
        );
        return true;
      }

      // Client errors (4xx) - provider configuration issues
      if (status >= 400 && status < 500) {
        this.logger.warn(
          `Client error with provider: ${this.getProviderName()} - Status: ${status}`,
        );
        return true;
      }

      // Server errors (5xx) - provider server issues
      if (status >= 500 && status < 600) {
        this.logger.warn(
          `Server error with provider: ${this.getProviderName()} - Status: ${status}`,
        );
        return true;
      }
    }

    // Blockchain-specific provider issues
    const providerChangePatterns = [
      /rate limit/i,
      /quota exceeded/i,
      /service unavailable/i,
      /bad gateway/i,
      /gateway timeout/i,
      /provider error/i,
      /rpc.*unavailable/i,
      /node.*sync/i,
      /connection.*refused/i,
    ];

    const shouldChange = providerChangePatterns.some((pattern) =>
      pattern.test(errorString),
    );

    if (shouldChange) {
      this.logger.warn(`Provider issue detected: ${error.message}`);
    }

    return shouldChange;
  }

  getRetryDelay(error: Error, attemptNumber: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds

    // Rate limiting gets longer delays
    if (/rate limit/i.test(error.message)) {
      return Math.min(baseDelay * Math.pow(3, attemptNumber), maxDelay);
    }

    // Server errors get moderate delays
    if (/server error|5\d\d/i.test(error.message)) {
      return Math.min(baseDelay * Math.pow(2, attemptNumber), maxDelay);
    }

    // Network errors get shorter delays
    if (/network|timeout|connection/i.test(error.message)) {
      return Math.min(baseDelay * attemptNumber, maxDelay);
    }

    // Default exponential backoff
    return Math.min(baseDelay * Math.pow(2, attemptNumber - 1), maxDelay);
  }

  // Provider health checking
  abstract isProviderHealthy(): Promise<boolean>;
  abstract getProviderLatency(): Promise<number>;
  abstract getProviderName(): string;
  abstract getAvailableProviders(): string[];

  // Utility methods
  protected parseError(error: Error): any {
    try {
      return JSON.parse(JSON.stringify(error));
    } catch {
      return { message: error.message, name: error.name };
    }
  }

  protected async sleep(ms: number): Promise<void> {
    this.logger.debug(`Sleeping for ${ms}ms...`);
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected validateChainId(chainId: SupportedChains): void {
    if (!this.isChainSupported(chainId)) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }
  }

  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    operationName: string = 'blockchain operation',
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `${operationName} failed (attempt ${attempt}/${maxRetries}): ${lastError.message}`,
        );

        // If it's the last attempt or error is not retryable, throw
        if (attempt === maxRetries || !this.isRetryableError(lastError)) {
          break;
        }

        // If we should change provider, do it
        if (this.shouldChangeProvider(lastError)) {
          try {
            await this.switchProvider();
            this.logger.log(
              `Switched provider due to error, retrying ${operationName}`,
            );
          } catch (switchError) {
            this.logger.error(
              `Failed to switch provider: ${switchError.message}`,
            );
          }
        }

        // Wait before retrying
        const delay = this.getRetryDelay(lastError, attempt);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  // Lifecycle hooks
  protected async onProviderSwitch(): Promise<void> {
    // Override in concrete implementations for custom logic
    this.logger.debug('Provider switched');
  }

  protected async onChainSwitch(newChainId: SupportedChains): Promise<void> {
    // Override in concrete implementations for custom logic
    this.logger.debug(`Chain switched to ${newChainId}`);
  }

  protected async onError(error: Error, context: string): Promise<void> {
    // Override in concrete implementations for custom error handling
    this.logger.error(
      `Blockchain error in ${context}: ${error.message}`,
      error.stack,
    );
  }
}
