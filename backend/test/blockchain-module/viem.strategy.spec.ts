import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ViemBlockchainStrategy } from '../strategies/viem.strategy';
import { ChainService } from '../chain.service';
import { SupportedChains } from '../types';
import { BlockchainTestUtils } from './test-utils';
import { Hash, Address } from 'viem';
import { vi } from 'vitest';

// Mock viem
vi.mock('viem', () => ({
  createClient: vi.fn(),
  createWalletClient: vi.fn(),
  http: vi.fn(),
  BlockNotFoundError: class BlockNotFoundError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'BlockNotFoundError';
    }
  },
}));

describe('ViemBlockchainStrategy', () => {
  let strategy: ViemBlockchainStrategy;
  let configService: any;
  let chainService: any;
  let module: TestingModule;

  // Mock viem clients
  const mockPublicClient = {
    getBlockNumber: vi.fn(),
    getBlock: vi.fn(),
    getTransaction: vi.fn(),
    getTransactionReceipt: vi.fn(),
    waitForTransactionReceipt: vi.fn(),
    getBalance: vi.fn(),
    getTransactionCount: vi.fn(),
    estimateGas: vi.fn(),
    getGasPrice: vi.fn(),
    estimateFeesPerGas: vi.fn(),
    call: vi.fn(),
    getLogs: vi.fn(),
    sendRawTransaction: vi.fn(),
    chain: { id: 11155111, name: 'Polygon' },
  };

  const mockWalletClient = {
    // Wallet client methods would go here
  };

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock viem functions
    const viem = await import('viem');
    vi.mocked(viem.createClient).mockReturnValue(mockPublicClient as any);
    vi.mocked(viem.createWalletClient).mockReturnValue(mockWalletClient as any);
    vi.mocked(viem.http).mockReturnValue('mock-transport' as any);

    configService = BlockchainTestUtils.createMockConfigService();
    chainService = BlockchainTestUtils.createMockChainService();

    module = await Test.createTestingModule({
      providers: [
        ViemBlockchainStrategy,
        { provide: ConfigService, useValue: configService },
        { provide: ChainService, useValue: chainService },
      ],
    }).compile();

    strategy = module.get<ViemBlockchainStrategy>(ViemBlockchainStrategy);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('constructor', () => {
    it('should create instance successfully', () => {
      expect(strategy).toBeDefined();
      expect(strategy['isInitialized']).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should initialize with default chain ID', async () => {
      await strategy.initialize();

      expect(strategy['currentChainId']).toBe(11155111);
      expect(strategy['isInitialized']).toBe(true);
      expect(strategy['chainConfig']).toBeDefined();
      expect(strategy['currentProvider']).toBeDefined();
    });

    it('should initialize with specified chain ID', async () => {
      await strategy.initialize(11155111);

      expect(strategy['currentChainId']).toBe(11155111);
      expect(strategy['isInitialized']).toBe(true);
    });

    it('should throw error for unsupported chain', async () => {
      vi.spyOn(strategy, 'isChainSupported').mockReturnValue(false);

      await expect(strategy.initialize(999 as SupportedChains)).rejects.toThrow(
        'Unsupported chain ID: 999',
      );
    });

    it('should throw error when no providers configured', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'blockchain.chains') {
          return {
            11155111: { name: 'Polygon', providers: [] },
          };
        }
        return BlockchainTestUtils.createMockConfigService().get(key);
      });

      await expect(strategy.initialize(11155111)).rejects.toThrow(
        'No providers configured for chain 11155111',
      );
    });

    it('should create clients during initialization', async () => {
      const createClientsSpy = vi.spyOn(strategy as any, 'createClients');

      await strategy.initialize(11155111);

      expect(createClientsSpy).toHaveBeenCalled();
    });
  });

  describe('switchChain', () => {
    beforeEach(async () => {
      await strategy.initialize(11155111);
    });

    it('should switch to different chain', async () => {
      // Mock the isChainSupported method directly on the strategy
      vi.spyOn(strategy, 'isChainSupported').mockReturnValue(true);

      await strategy.switchChain(1 as SupportedChains);

      expect(strategy['currentChainId']).toBe(1);
      expect(strategy['chainConfig']).toBeDefined();
    });

    it('should not switch if already on target chain', async () => {
      const createClientsSpy = vi.spyOn(strategy as any, 'createClients');

      await strategy.switchChain(11155111);

      expect(createClientsSpy).not.toHaveBeenCalled();
    });

    it('should fallback to default chain for unsupported chain', async () => {
      vi.spyOn(strategy, 'isChainSupported').mockReturnValue(false);

      await strategy.switchChain(999 as SupportedChains);

      // Should fallback to default chain (11155111)
      expect(strategy['currentChainId']).toBe(11155111);
    });
  });

  describe('getCurrentChain', () => {
    it('should return current chain', async () => {
      await strategy.initialize(11155111);

      const chain = await strategy.getCurrentChain();

      expect(chain).toEqual({ id: 11155111, name: 'Polygon' });
    });

    it('should throw error if not initialized', async () => {
      await expect(strategy.getCurrentChain()).rejects.toThrow(
        'Viem strategy not initialized',
      );
    });
  });

  describe('switchProvider', () => {
    beforeEach(async () => {
      await strategy.initialize(11155111);
    });

    it('should switch to next provider', async () => {
      const originalProvider = strategy['currentProvider'];
      const createClientsSpy = vi.spyOn(strategy as any, 'createClients');

      await strategy.switchProvider();

      expect(strategy['currentProvider']).not.toBe(originalProvider);
      expect(createClientsSpy).toHaveBeenCalled();
    });

    it('should throw error when no alternative providers', async () => {
      // Mock single provider configuration
      strategy['chainConfig'] = {
        name: 'Polygon',
        id: 11155111,
        nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
        rpcUrls: {
          default: {
            http: ['https://polygon-mainnet.g.alchemy.com/v2/test-key'],
          },
        },
        providers: [strategy['currentProvider']],
      };

      await expect(strategy.switchProvider()).rejects.toThrow(
        'No alternative providers available',
      );
    });
  });

  describe('Public Client Methods', () => {
    beforeEach(async () => {
      await strategy.initialize(11155111);
    });

    describe('getBlockNumber', () => {
      it('should return block number', async () => {
        mockPublicClient.getBlockNumber.mockResolvedValue(BigInt(12345678));

        const result = await strategy.getBlockNumber();

        expect(result).toBe(BigInt(12345678));
        expect(mockPublicClient.getBlockNumber).toHaveBeenCalled();
      });

      it('should retry on failure', async () => {
        mockPublicClient.getBlockNumber
          .mockRejectedValueOnce(BlockchainTestUtils.createNetworkError())
          .mockResolvedValue(BigInt(12345678));

        const result = await strategy.getBlockNumber();

        expect(result).toBe(BigInt(12345678));
        expect(mockPublicClient.getBlockNumber).toHaveBeenCalledTimes(2);
      });
    });

    describe('getBlock', () => {
      it('should get block by number', async () => {
        const mockBlock = { number: BigInt(12345678), hash: '0x123' };
        mockPublicClient.getBlock.mockResolvedValue(mockBlock);

        const result = await strategy.getBlock(BigInt(12345678));

        expect(result).toEqual(mockBlock);
        expect(mockPublicClient.getBlock).toHaveBeenCalledWith({
          blockNumber: BigInt(12345678),
        });
      });

      it('should get block by hash', async () => {
        const mockBlock = { number: BigInt(12345678), hash: '0x123' };
        mockPublicClient.getBlock.mockResolvedValue(mockBlock);

        const result = await strategy.getBlock('0x123' as Hash);

        expect(result).toEqual(mockBlock);
        expect(mockPublicClient.getBlock).toHaveBeenCalledWith({
          blockHash: '0x123',
        });
      });
    });

    describe('getTransaction', () => {
      it('should get transaction by hash', async () => {
        const mockTx = { hash: '0x123', from: '0xabc', to: '0xdef' };
        mockPublicClient.getTransaction.mockResolvedValue(mockTx);

        const result = await strategy.getTransaction('0x123' as Hash);

        expect(result).toEqual(mockTx);
        expect(mockPublicClient.getTransaction).toHaveBeenCalledWith({
          hash: '0x123',
        });
      });
    });

    describe('getTransactionReceipt', () => {
      it('should get transaction receipt', async () => {
        const mockReceipt = { transactionHash: '0x123', status: 'success' };
        mockPublicClient.getTransactionReceipt.mockResolvedValue(mockReceipt);

        const result = await strategy.getTransactionReceipt('0x123' as Hash);

        expect(result).toEqual(mockReceipt);
        expect(mockPublicClient.getTransactionReceipt).toHaveBeenCalledWith({
          hash: '0x123',
        });
      });
    });

    describe('waitForTransactionReceipt', () => {
      it('should wait for transaction receipt', async () => {
        const mockReceipt = { transactionHash: '0x123', status: 'success' };
        mockPublicClient.waitForTransactionReceipt.mockResolvedValue(
          mockReceipt,
        );

        const result = await strategy.waitForTransactionReceipt(
          '0x123' as Hash,
        );

        expect(result).toEqual(mockReceipt);
      });

      it('should wait for transaction receipt with real transaction hash', async () => {
        const mockReceipt = {
          transactionHash:
            '0x78ae4b6fa3d27fa7fcab1b294c6aee8eddb331894c41d0fbe39c79588c9bf9e7',
          status: 'success',
        };

        // Reset any previous mock state
        mockPublicClient.waitForTransactionReceipt.mockReset();
        mockPublicClient.waitForTransactionReceipt.mockResolvedValue(
          mockReceipt,
        );

        const result = await strategy.waitForTransactionReceipt(
          '0x78ae4b6fa3d27fa7fcab1b294c6aee8eddb331894c41d0fbe39c79588c9bf9e7' as Hash,
        );

        expect(result).toEqual(mockReceipt);
        expect(
          mockPublicClient.waitForTransactionReceipt,
        ).toHaveBeenCalledTimes(1);
      });

      it('should throw error for reverted transaction', async () => {
        const mockReceipt = {
          transactionHash: '0x123',
          status: 'reverted',
          logs: [],
        };
        mockPublicClient.waitForTransactionReceipt.mockReset();
        mockPublicClient.waitForTransactionReceipt.mockResolvedValue(
          mockReceipt,
        );

        await expect(
          strategy.waitForTransactionReceipt('0x123' as Hash),
        ).rejects.toThrow('Transaction 0x123 reverted');
      });
    });

    describe('getBalance', () => {
      it('should get balance for address', async () => {
        mockPublicClient.getBalance.mockResolvedValue(
          BigInt(1000000000000000000),
        );

        const result = await strategy.getBalance('0x123' as Address);

        expect(result).toBe(BigInt(1000000000000000000));
        expect(mockPublicClient.getBalance).toHaveBeenCalledWith({
          address: '0x123',
        });
      });

      it('should get balance for specific block', async () => {
        mockPublicClient.getBalance.mockResolvedValue(
          BigInt(1000000000000000000),
        );

        const result = await strategy.getBalance(
          '0x123' as Address,
          BigInt(12345678),
        );

        expect(result).toBe(BigInt(1000000000000000000));
        expect(mockPublicClient.getBalance).toHaveBeenCalledWith({
          address: '0x123',
          blockNumber: BigInt(12345678),
        });
      });
    });

    describe('getTransactionCount', () => {
      it('should get transaction count', async () => {
        mockPublicClient.getTransactionCount.mockResolvedValue(42);

        const result = await strategy.getTransactionCount('0x123' as Address);

        expect(result).toBe(42);
        expect(mockPublicClient.getTransactionCount).toHaveBeenCalledWith({
          address: '0x123',
        });
      });
    });

    describe('estimateGas', () => {
      it('should estimate gas for transaction', async () => {
        mockPublicClient.estimateGas.mockResolvedValue(BigInt(21000));

        const tx = BlockchainTestUtils.getMockTransactionData();
        const result = await strategy.estimateGas(tx);

        expect(result).toBe(BigInt(21000));
        expect(mockPublicClient.estimateGas).toHaveBeenCalledWith(tx);
      });
    });

    describe('getGasPrice', () => {
      it('should get current gas price', async () => {
        mockPublicClient.getGasPrice.mockResolvedValue(BigInt(20000000000));

        const result = await strategy.getGasPrice();

        expect(result).toBe(BigInt(20000000000));
        expect(mockPublicClient.getGasPrice).toHaveBeenCalled();
      });
    });

    describe('estimateFeesPerGas', () => {
      it('should estimate EIP-1559 fees', async () => {
        const mockFees = {
          maxFeePerGas: BigInt(30000000000),
          maxPriorityFeePerGas: BigInt(2000000000),
        };
        mockPublicClient.estimateFeesPerGas.mockResolvedValue(mockFees);

        const result = await strategy.estimateFeesPerGas();

        expect(result).toEqual(mockFees);
        expect(mockPublicClient.estimateFeesPerGas).toHaveBeenCalled();
      });
    });

    describe('call', () => {
      it('should call contract method', async () => {
        mockPublicClient.call.mockResolvedValue('0x1234567890abcdef');

        const tx = BlockchainTestUtils.getMockTransactionData();
        const result = await strategy.call(tx);

        expect(result).toBe('0x1234567890abcdef');
        expect(mockPublicClient.call).toHaveBeenCalledWith({
          to: tx.to,
          data: tx.data,
          value: tx.value,
        });
      });
    });

    describe('getLogs', () => {
      it('should get contract logs', async () => {
        const mockLogs = [{ address: '0x123', topics: ['0xabc'] }];
        mockPublicClient.getLogs.mockResolvedValue(mockLogs);

        const options = { address: '0x123' as Address };
        const result = await strategy.getLogs(options);

        expect(result).toEqual(mockLogs);
        expect(mockPublicClient.getLogs).toHaveBeenCalledWith(options);
      });
    });

    describe('getTokenBalance', () => {
      it('should get ERC-20 token balance', async () => {
        mockPublicClient.call.mockResolvedValue(
          '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
        );

        const result = await strategy.getTokenBalance(
          '0x123' as Address,
          '0xabc' as Address,
        );

        expect(result).toBe(BigInt(1000000000000000000));
        expect(mockPublicClient.call).toHaveBeenCalled();
      });
    });

    describe('getTokenInfo', () => {
      it('should throw not implemented error', async () => {
        await expect(strategy.getTokenInfo('0x123' as Address)).rejects.toThrow(
          'getTokenInfo not implemented - requires contract ABI integration',
        );
      });
    });
  });

  describe('Private Client Methods', () => {
    beforeEach(async () => {
      await strategy.initialize(11155111);
    });

    describe('prepareTransaction', () => {
      it('should prepare transaction with gas and fees', async () => {
        mockPublicClient.estimateGas.mockResolvedValue(BigInt(21000));
        mockPublicClient.estimateFeesPerGas.mockResolvedValue({
          maxFeePerGas: BigInt(30000000000),
          maxPriorityFeePerGas: BigInt(2000000000),
        });
        mockPublicClient.getTransactionCount.mockResolvedValue(42);

        const tx = BlockchainTestUtils.getMockTransactionData();
        const fromAddress = '0x123' as Address;

        const result = await strategy.prepareTransaction(tx, fromAddress);

        expect(result).toEqual({
          ...tx,
          from: fromAddress,
          gas: BigInt(21000),
          maxFeePerGas: BigInt(30000000000),
          maxPriorityFeePerGas: BigInt(2000000000),
          chainId: 11155111,
        });
      });
    });

    describe('sendRawTransaction', () => {
      it('should send signed transaction', async () => {
        mockPublicClient.sendRawTransaction.mockResolvedValue(
          '0x1234567890abcdef',
        );

        const signedTx = BlockchainTestUtils.getMockSignedTransaction();
        const result = await strategy.sendRawTransaction(signedTx);

        expect(result).toBe('0x1234567890abcdef');
        expect(mockPublicClient.sendRawTransaction).toHaveBeenCalledWith({
          serializedTransaction: signedTx.signature,
        });
      });

      //   it('should throw error for unsigned transaction', async () => {
      //     const unsignedTx = {
      //       ...BlockchainTestUtils.getMockSignedTransaction(),
      //     };
      //     delete unsignedTx.signature;

      //     await expect(strategy.sendRawTransaction(unsignedTx)).rejects.toThrow(
      //       'Transaction must be signed',
      //     );
      //   });
    });

    // describe('sendTransactionAndWait', () => {
    //   it('should send transaction and wait for receipt', async () => {
    //     const mockReceipt = { transactionHash: '0x123', status: 'success' };
    //     mockPublicClient.sendRawTransaction.mockResolvedValue('0x123');
    //     mockPublicClient.waitForTransactionReceipt.mockResolvedValue(
    //       mockReceipt,
    //     );

    //     const signedTx = BlockchainTestUtils.getMockSignedTransaction();
    //     const result = await strategy.sendTransactionAndWait(signedTx);

    //     expect(result).toEqual(mockReceipt);
    //   });
    // });

    describe('cancelTransaction', () => {
      it('should throw not implemented error', async () => {
        await expect(
          strategy.cancelTransaction('0x123' as Hash),
        ).rejects.toThrow(
          'cancelTransaction not implemented - requires wallet integration',
        );
      });
    });

    describe('speedUpTransaction', () => {
      it('should throw not implemented error', async () => {
        await expect(
          strategy.speedUpTransaction('0x123' as Hash),
        ).rejects.toThrow(
          'speedUpTransaction not implemented - requires wallet integration',
        );
      });
    });
  });

  describe('Provider Health Methods', () => {
    beforeEach(async () => {
      await strategy.initialize(11155111);
    });

    describe('isProviderHealthy', () => {
      it('should return true for healthy provider', async () => {
        mockPublicClient.getBlockNumber.mockResolvedValue(BigInt(12345678));

        const result = await strategy.isProviderHealthy();

        expect(result).toBe(true);
      });

      it('should return false for unhealthy provider', async () => {
        mockPublicClient.getBlockNumber.mockRejectedValue(
          new Error('Connection failed'),
        );

        const result = await strategy.isProviderHealthy();

        expect(result).toBe(false);
      });

      it('should return false for slow provider', async () => {
        mockPublicClient.getBlockNumber.mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 6000)); // 6 seconds
          return BigInt(12345678);
        });

        const result = await strategy.isProviderHealthy();

        expect(result).toBe(false);
      }, 10000); // Increase timeout to 10 seconds
    });

    describe('getProviderLatency', () => {
      it('should return latency for successful request', async () => {
        mockPublicClient.getBlockNumber.mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return BigInt(12345678);
        });

        const result = await strategy.getProviderLatency();

        expect(result).toBeGreaterThanOrEqual(90);
        expect(result).toBeLessThan(200);
      });

      it('should return -1 for failed request', async () => {
        mockPublicClient.getBlockNumber.mockRejectedValue(
          new Error('Connection failed'),
        );

        const result = await strategy.getProviderLatency();

        expect(result).toBe(-1);
      });
    });

    describe('getProviderName', () => {
      it('should return current provider name', () => {
        const name = strategy.getProviderName();
        expect(name).toBe('alchemy');
      });
    });

    describe('getAvailableProviders', () => {
      it('should return list of available providers', () => {
        const providers = strategy.getAvailableProviders();
        expect(providers).toEqual(['alchemy', 'infura']);
      });
    });
  });

  describe('Utility Methods', () => {
    beforeEach(async () => {
      await strategy.initialize(11155111);
    });

    describe('getCurrentProviderConfig', () => {
      it('should return current provider configuration', () => {
        const config = strategy.getCurrentProviderConfig();

        expect(config).toEqual({
          name: 'alchemy',
          blockRange: { from: 0, to: 'latest' },
          index: 0,
          totalProviders: 2,
          timeout: 30000,
          retryAttempts: 3,
        });
      });
    });

    describe('getBlockchainConfig', () => {
      it('should return blockchain configuration', () => {
        const config = strategy.getBlockchainConfig();

        expect(config).toEqual({
          defaultChainId: 11155111,
          defaultProvider: 'viem',
          timeout: 30000,
          retryAttempts: 3,
          confirmations: 2,
        });
      });
    });

    describe('getCurrentChainConfig', () => {
      it('should return current chain configuration', () => {
        const config = strategy.getCurrentChainConfig();

        expect(config.name).toBe('Polygon');
        expect(config.providers).toHaveLength(2);
      });
    });

    describe('createWalletClient', () => {
      it('should create wallet client', () => {
        const account = '0x123' as Address;
        const walletClient = strategy.createWalletClient(account);

        expect(walletClient).toBe(mockWalletClient);
      });

      it('should throw error for unsupported chain', () => {
        strategy['currentChainId'] = 999 as SupportedChains;
        const account = '0x123' as Address;

        expect(() => strategy.createWalletClient(account)).toThrow(
          'Unsupported chain: 999',
        );
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await strategy.initialize(11155111);
    });

    it('should handle provider switching on rate limit', async () => {
      const switchProviderSpy = vi.spyOn(strategy, 'switchProvider');
      mockPublicClient.getBlockNumber
        .mockRejectedValueOnce(BlockchainTestUtils.createRateLimitError())
        .mockResolvedValue(BigInt(12345678));

      const result = await strategy.getBlockNumber();

      expect(result).toBe(BigInt(12345678));
      expect(switchProviderSpy).toHaveBeenCalled();
    });

    it('should retry on network errors', async () => {
      mockPublicClient.getBlockNumber
        .mockRejectedValueOnce(BlockchainTestUtils.createNetworkError())
        .mockRejectedValueOnce(BlockchainTestUtils.createNetworkError())
        .mockResolvedValue(BigInt(12345678));

      const result = await strategy.getBlockNumber();

      expect(result).toBe(BigInt(12345678));
      expect(mockPublicClient.getBlockNumber).toHaveBeenCalledTimes(3);
    });
  });
});
