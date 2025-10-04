import { ConfigService } from '@nestjs/config';
import { ChainService } from '../chain.service';
import {
  BlockchainProviderConfig,
  ChainConfig,
} from '../types/blockchain-config.types';
import { SignedTransaction, SupportedChains } from '../types';
import { vi } from 'vitest';
import { Address, Hash } from 'viem';

/**
 * Test utilities for blockchain module testing
 */
export class BlockchainTestUtils {
  /**
   * Create a mock ConfigService with blockchain configuration
   */
  static createMockConfigService(config: Partial<any> = {}): any {
    const defaultConfig = {
      'blockchain.defaultChainId': 137,
      'blockchain.defaultProvider': 'viem',
      'blockchain.timeout': 30000,
      'blockchain.retryAttempts': 3,
      'blockchain.confirmations': 2,
      'blockchain.chains': {
        137: {
          name: 'Polygon',
          providers: [
            {
              name: 'alchemy',
              transport: 'https://polygon-mainnet.g.alchemy.com/v2/test-key',
              timeout: 30000,
              retryAttempts: 3,
              blockRange: { from: 0, to: 'latest' },
            },
            {
              name: 'infura',
              transport: 'https://polygon-mainnet.infura.io/v3/test-key',
              timeout: 30000,
              retryAttempts: 3,
              blockRange: { from: 0, to: 'latest' },
            },
          ],
        },
        1: {
          name: 'Ethereum',
          providers: [
            {
              name: 'infura',
              transport: 'https://mainnet.infura.io/v3/test-key',
              timeout: 30000,
              retryAttempts: 3,
              blockRange: { from: 0, to: 'latest' },
            },
          ],
        },
      },
      ...config,
    };

    const mockConfigService = {
      get: vi.fn((key: string, defaultValue?: any) => {
        return defaultConfig[key] ?? defaultValue;
      }),
    };

    return mockConfigService;
  }

  /**
   * Create a mock ChainService
   */
  static createMockChainService(): any {
    return {
      getSupportedChains: vi.fn().mockReturnValue([1, 137, 56]),
      isSupportedChain: vi
        .fn()
        .mockImplementation((chainId: SupportedChains) =>
          [1, 137, 56].includes(chainId),
        ),
      getChainName: vi.fn().mockImplementation((chainId: SupportedChains) => {
        const names = { 1: 'Ethereum', 137: 'Polygon', 56: 'BSC' };
        return names[chainId] || 'Unknown';
      }),
      getViemChain: vi.fn().mockImplementation((chainId: SupportedChains) => {
        const chains = {
          1: { id: 1, name: 'Ethereum' },
          137: { id: 137, name: 'Polygon' },
          56: { id: 56, name: 'BSC' },
        };
        return chains[chainId];
      }),
      getChainExplorer: vi
        .fn()
        .mockImplementation((chainId: SupportedChains) => {
          const explorers = {
            1: 'https://etherscan.io',
            137: 'https://polygonscan.com',
            56: 'https://bscscan.com',
          };
          return explorers[chainId];
        }),
      getChainCurrency: vi
        .fn()
        .mockImplementation((chainId: SupportedChains) => {
          const currencies = {
            1: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            137: { name: 'POL', symbol: 'POL', decimals: 18 },
            56: { name: 'BNB', symbol: 'BNB', decimals: 18 },
          };
          return currencies[chainId];
        }),
    };
  }

  /**
   * Create mock blockchain configuration
   */
  static createMockBlockchainConfig(): Record<number, ChainConfig> {
    return {
      137: {
        id: 137,
        nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
        rpcUrls: {
          default: {
            http: ['https://polygon-mainnet.g.alchemy.com/v2/test-key'],
          },
        },
        name: 'Polygon',
        providers: [
          {
            name: 'alchemy',
            transport: 'https://polygon-mainnet.g.alchemy.com/v2/test-key',
            timeout: 30000,
            retryAttempts: 3,
            blockRange: 100n,
          },
          {
            name: 'infura',
            transport: 'https://polygon-mainnet.infura.io/v3/test-key',
            timeout: 30000,
            retryAttempts: 3,
            blockRange: 100n,
          },
        ],
      },
      1: {
        id: 1,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: {
          default: { http: ['https://eth-mainnet.g.alchemy.com/v2/test-key'] },
        },
        name: 'Ethereum',
        providers: [
          {
            name: 'alchemy',
            transport: 'https://eth-mainnet.g.alchemy.com/v2/test-key',
            timeout: 30000,
            retryAttempts: 3,
            blockRange: 100n,
          },
        ],
      },
    };
  }

  /**
   * Create mock Viem client responses
   */
  static createMockViemResponses() {
    return {
      getBlockNumber: vi.fn().mockResolvedValue(BigInt(12345678)),
      getBlock: vi.fn().mockResolvedValue({
        number: BigInt(12345678),
        hash: '0x1234567890abcdef',
        timestamp: BigInt(1640995200),
      }),
      getTransaction: vi.fn().mockResolvedValue({
        hash: '0x1234567890abcdef',
        from: '0xabcdef1234567890',
        to: '0x0987654321fedcba',
        value: BigInt(1000000000000000000),
      }),
      getTransactionReceipt: vi.fn().mockResolvedValue({
        transactionHash: '0x1234567890abcdef',
        status: 'success',
        blockNumber: BigInt(12345678),
        gasUsed: BigInt(21000),
      }),
      waitForTransactionReceipt: vi.fn().mockResolvedValue({
        transactionHash: '0x1234567890abcdef',
        status: 'success',
        blockNumber: BigInt(12345678),
        gasUsed: BigInt(21000),
      }),
      getBalance: vi.fn().mockResolvedValue(BigInt(1000000000000000000)),
      getTransactionCount: vi.fn().mockResolvedValue(42),
      estimateGas: vi.fn().mockResolvedValue(BigInt(21000)),
      getGasPrice: vi.fn().mockResolvedValue(BigInt(20000000000)),
      estimateFeesPerGas: vi.fn().mockResolvedValue({
        maxFeePerGas: BigInt(30000000000),
        maxPriorityFeePerGas: BigInt(2000000000),
      }),
      call: vi.fn().mockResolvedValue('0x1234567890abcdef'),
      getLogs: vi.fn().mockResolvedValue([]),
      sendRawTransaction: vi.fn().mockResolvedValue('0x1234567890abcdef'),
    };
  }

  /**
   * Create mock addresses for testing
   */
  static getMockAddresses() {
    return {
      user: '0x1234567890123456789012345678901234567890' as Hash,
      contract: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Hash,
      token: '0x9876543210987654321098765432109876543210' as Hash,
    };
  }

  /**
   * Create mock transaction data
   */
  static getMockTransactionData() {
    return {
      to: this.getMockAddresses().contract,
      data: '0x1234567890abcdef' as Hash,
      value: BigInt(1000000000000000000),
      type: 'eip1559' as const,
    };
  }

  /**
   * Create mock signed transaction
   */
  static getMockSignedTransaction(): SignedTransaction {
    return {
      to: this.getMockAddresses().contract,
      data: '0x1234567890abcdef' as Hash,
      from: '0x1234567890123456789012345678901234567890' as Address,
      value: 1000000000000000000n,
      gas: 21000n,
      maxFeePerGas: 30000000000n,
      maxPriorityFeePerGas: 2000000000n,
      type: 'eip1559',
      nonce: 42n,
      chainId: 1,
      signature:
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12',
    };
  }

  /**
   * Create mock error for testing error handling
   */
  static createMockError(message: string, code?: number): Error {
    const error = new Error(message);
    if (code) {
      (error as any).code = code;
    }
    return error;
  }

  /**
   * Create network error for testing retry logic
   */
  static createNetworkError(): Error {
    return new Error('Network error: connection timeout');
  }

  /**
   * Create rate limit error for testing provider switching
   */
  static createRateLimitError(): Error {
    const error = new Error('Rate limit exceeded');
    (error as any).status = 429;
    return error;
  }

  /**
   * Create server error for testing error handling
   */
  static createServerError(): Error {
    const error = new Error('Internal server error');
    (error as any).status = 500;
    return error;
  }
}
