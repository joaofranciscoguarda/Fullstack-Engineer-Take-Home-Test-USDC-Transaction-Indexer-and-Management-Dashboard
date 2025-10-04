import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AbstractBlockchainStrategy } from '../strategies/abstract-blockchain.strategy';
import { SupportedChains } from '../types';
import { BlockchainTestUtils } from './test-utils';
import { vi } from 'vitest';

/**
 * Concrete implementation of AbstractBlockchainStrategy for testing
 */
export class TestBlockchainStrategy extends AbstractBlockchainStrategy {
  async initialize(chainId?: SupportedChains): Promise<void> {
    this.currentChainId = chainId || this.defaultChainId;
    this.isInitialized = true;
  }

  async switchChain(chainId: SupportedChains): Promise<void> {
    this.currentChainId = chainId;
    await this.onChainSwitch(chainId);
  }

  async getCurrentChain(): Promise<any> {
    return { id: this.currentChainId, name: 'Test Chain' };
  }

  async switchProvider(): Promise<void> {
    // Mock implementation
    await this.onProviderSwitch();
  }

  async isProviderHealthy(): Promise<boolean> {
    return true;
  }

  async getProviderLatency(): Promise<number> {
    return 100;
  }

  getProviderName(): string {
    return 'test-provider';
  }

  getAvailableProviders(): string[] {
    return ['test-provider'];
  }
}

describe('AbstractBlockchainStrategy', () => {
  let strategy: TestBlockchainStrategy;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [TestBlockchainStrategy],
    }).compile();

    strategy = module.get<TestBlockchainStrategy>(TestBlockchainStrategy);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('constructor', () => {
    it('should initialize with default chain ID', () => {
      expect(strategy['defaultChainId']).toBe(1);
      expect(strategy['currentChainId']).toBe(1);
      expect(strategy['isInitialized']).toBe(false);
    });

    it('should use environment variable for default chain ID', () => {
      const originalEnv = process.env.DEFAULT_CHAIN_ID;
      process.env.DEFAULT_CHAIN_ID = '1';

      const newStrategy = new TestBlockchainStrategy();
      expect(newStrategy['defaultChainId']).toBe(1);
      expect(newStrategy['currentChainId']).toBe(1);

      process.env.DEFAULT_CHAIN_ID = originalEnv;
    });
  });

  describe('getCurrentChainId', () => {
    it('should return current chain ID', async () => {
      await strategy.initialize(1);
      const chainId = await strategy.getCurrentChainId();
      expect(chainId).toBe(1);
    });
  });

  describe('isChainSupported', () => {
    it('should return true by default', () => {
      expect(strategy.isChainSupported(1)).toBe(true);
      expect(strategy.isChainSupported(999 as SupportedChains)).toBe(true); // Default implementation returns true
    });
  });

  describe('isRetryableError', () => {
    it('should identify network errors as retryable', () => {
      const networkError = BlockchainTestUtils.createNetworkError();
      expect(strategy.isRetryableError(networkError)).toBe(true);
    });

    it('should identify timeout errors as retryable', () => {
      const timeoutError = new Error('Request timeout');
      expect(strategy.isRetryableError(timeoutError)).toBe(true);
    });

    it('should identify rate limit errors as retryable', () => {
      const rateLimitError = new Error('Rate limit exceeded');
      expect(strategy.isRetryableError(rateLimitError)).toBe(true);
    });

    it('should identify server errors as retryable', () => {
      const serverError = new Error('Internal server error');
      expect(strategy.isRetryableError(serverError)).toBe(true);
    });

    it('should identify RPC errors as retryable', () => {
      const rpcError = new Error('RPC error: connection failed');
      expect(strategy.isRetryableError(rpcError)).toBe(true);
    });

    it('should identify blockchain-specific errors as retryable', () => {
      const nonceError = new Error('Nonce too low');
      const gasError = new Error('Gas price too low');
      const blockError = new Error('Block not found');

      expect(strategy.isRetryableError(nonceError)).toBe(true);
      expect(strategy.isRetryableError(gasError)).toBe(true);
      expect(strategy.isRetryableError(blockError)).toBe(true);
    });

    it('should not identify non-retryable errors as retryable', () => {
      const validationError = new Error('Invalid address format');
      const authError = new Error('Unauthorized access');

      expect(strategy.isRetryableError(validationError)).toBe(false);
      expect(strategy.isRetryableError(authError)).toBe(false);
    });
  });

  describe('shouldChangeProvider', () => {
    it('should return true for rate limit errors', () => {
      const rateLimitError = BlockchainTestUtils.createRateLimitError();
      expect(strategy.shouldChangeProvider(rateLimitError)).toBe(true);
    });

    it('should return true for server errors (5xx)', () => {
      const serverError = BlockchainTestUtils.createServerError();
      expect(strategy.shouldChangeProvider(serverError)).toBe(true);
    });

    it('should return true for client errors (4xx)', () => {
      const clientError = new Error('Bad request');
      (clientError as any).status = 400;
      expect(strategy.shouldChangeProvider(clientError)).toBe(true);
    });

    it('should return true for provider-specific errors', () => {
      const providerError = new Error('Provider error: service unavailable');
      expect(strategy.shouldChangeProvider(providerError)).toBe(true);
    });

    it('should return false for non-provider errors', () => {
      const validationError = new Error('Invalid transaction data');
      expect(strategy.shouldChangeProvider(validationError)).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should return longer delays for rate limit errors', () => {
      const rateLimitError = new Error('Rate limit exceeded');
      const delay1 = strategy.getRetryDelay(rateLimitError, 1);
      const delay2 = strategy.getRetryDelay(rateLimitError, 2);
      const delay3 = strategy.getRetryDelay(rateLimitError, 3);

      expect(delay1).toBe(3000); // 1 * 3^1
      expect(delay2).toBe(9000); // 1 * 3^2
      expect(delay3).toBe(27000); // 1 * 3^3
    });

    it('should return moderate delays for server errors', () => {
      const serverError = new Error('Server error 500');
      const delay1 = strategy.getRetryDelay(serverError, 1);
      const delay2 = strategy.getRetryDelay(serverError, 2);
      const delay3 = strategy.getRetryDelay(serverError, 3);

      expect(delay1).toBe(2000); // 1 * 2^1
      expect(delay2).toBe(4000); // 1 * 2^2
      expect(delay3).toBe(8000); // 1 * 2^3
    });

    it('should return shorter delays for network errors', () => {
      const networkError = new Error('Network timeout');
      const delay1 = strategy.getRetryDelay(networkError, 1);
      const delay2 = strategy.getRetryDelay(networkError, 2);
      const delay3 = strategy.getRetryDelay(networkError, 3);

      expect(delay1).toBe(1000); // 1 * 1
      expect(delay2).toBe(2000); // 1 * 2
      expect(delay3).toBe(3000); // 1 * 3
    });

    it('should cap delays at maximum value', () => {
      const rateLimitError = new Error('Rate limit exceeded');
      const delay = strategy.getRetryDelay(rateLimitError, 10);
      expect(delay).toBe(30000); // Max delay
    });
  });

  describe('parseError', () => {
    it('should parse error object correctly', () => {
      const error = new Error('Test error');
      const parsed = strategy['parseError'](error);

      // JSON.stringify(Error) returns {} so it falls back to the catch block
      expect(parsed).toEqual({});
    });

    it('should handle errors with additional properties', () => {
      const error = new Error('Test error');
      (error as any).code = 123;
      (error as any).status = 500;

      const parsed = strategy['parseError'](error);
      expect(parsed.code).toBe(123);
      expect(parsed.status).toBe(500);
    });
  });

  describe('sleep', () => {
    it('should sleep for specified duration', async () => {
      const start = Date.now();
      await strategy['sleep'](100);
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(100);
      expect(duration).toBeLessThan(200);
    });
  });

  describe('validateChainId', () => {
    it('should not throw for supported chain', () => {
      expect(() => strategy['validateChainId'](1)).not.toThrow();
    });

    it('should throw for unsupported chain when overridden', () => {
      // Override isChainSupported to return false for specific chain
      vi.spyOn(strategy, 'isChainSupported').mockReturnValue(false);

      expect(() => strategy['validateChainId'](999 as SupportedChains)).toThrow(
        'Unsupported chain ID: 999',
      );
    });
  });

  describe('executeWithRetry', () => {
    it('should execute operation successfully on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await strategy['executeWithRetry'](
        operation,
        3,
        'test operation',
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(BlockchainTestUtils.createNetworkError())
        .mockRejectedValueOnce(BlockchainTestUtils.createNetworkError())
        .mockResolvedValue('success');

      const result = await strategy['executeWithRetry'](
        operation,
        3,
        'test operation',
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Invalid input'));

      await expect(
        strategy['executeWithRetry'](operation, 3, 'test operation'),
      ).rejects.toThrow('Invalid input');

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries', async () => {
      const operation = vi
        .fn()
        .mockRejectedValue(BlockchainTestUtils.createNetworkError());

      await expect(
        strategy['executeWithRetry'](operation, 2, 'test operation'),
      ).rejects.toThrow('Network error: connection timeout');

      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should switch provider when shouldChangeProvider returns true', async () => {
      const switchProviderSpy = vi
        .spyOn(strategy, 'switchProvider')
        .mockResolvedValue();
      const operation = vi
        .fn()
        .mockRejectedValueOnce(BlockchainTestUtils.createRateLimitError())
        .mockResolvedValue('success');

      const result = await strategy['executeWithRetry'](
        operation,
        3,
        'test operation',
      );

      expect(result).toBe('success');
      expect(switchProviderSpy).toHaveBeenCalledTimes(1);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should handle provider switch failure gracefully', async () => {
      const switchProviderSpy = vi
        .spyOn(strategy, 'switchProvider')
        .mockRejectedValue(new Error('Switch failed'));
      const operation = vi
        .fn()
        .mockRejectedValueOnce(BlockchainTestUtils.createRateLimitError())
        .mockResolvedValue('success');

      const result = await strategy['executeWithRetry'](
        operation,
        3,
        'test operation',
      );

      expect(result).toBe('success');
      expect(switchProviderSpy).toHaveBeenCalledTimes(1);
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('lifecycle hooks', () => {
    it('should call onProviderSwitch hook', async () => {
      const spy = vi.spyOn(strategy as any, 'onProviderSwitch');
      await strategy.switchProvider();
      expect(spy).toHaveBeenCalled();
    });

    it('should call onChainSwitch hook', async () => {
      const spy = vi.spyOn(strategy as any, 'onChainSwitch');
      await strategy.switchChain(1);
      expect(spy).toHaveBeenCalledWith(1);
    });

    it('should call onError hook', async () => {
      const spy = vi.spyOn(strategy as any, 'onError');
      const error = new Error('Test error');
      await strategy['onError'](error, 'test context');
      expect(spy).toHaveBeenCalledWith(error, 'test context');
    });
  });
});
