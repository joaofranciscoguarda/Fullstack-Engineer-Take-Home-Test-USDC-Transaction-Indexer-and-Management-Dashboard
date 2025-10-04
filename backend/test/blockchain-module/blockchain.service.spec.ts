import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BlockchainService } from '../blockchain.service';
import { BlockchainConfigFactory } from '../config/blockchain-config.factory';
import { ChainService } from '../chain.service';
import {
  BlockchainPublicClient,
  BlockchainPrivateClient,
} from '../strategies/blockchain-strategy.interface';
import { SupportedChains, BlockchainProvider } from '../types';
import { BlockchainTestUtils } from './test-utils';
import { Hash, Address, TransactionReceipt } from 'viem';
import { vi } from 'vitest';

// Mock strategy implementations
class MockBlockchainStrategy
  implements BlockchainPublicClient, BlockchainPrivateClient
{
  async initialize(chainId?: SupportedChains): Promise<void> {
    // Mock implementation
  }

  async switchChain(chainId: SupportedChains): Promise<void> {
    // Mock implementation
  }

  async getCurrentChain(): Promise<any> {
    return { id: 1, name: 'Polygon' };
  }

  async getCurrentChainId(): Promise<number> {
    return 1;
  }

  isChainSupported(chainId: SupportedChains): boolean {
    return [1, 56].includes(chainId);
  }

  // Public client methods
  async getBlockNumber(): Promise<bigint> {
    return BigInt(12345678);
  }

  async getBlock(blockIdentifier: bigint | Hash): Promise<any> {
    return { number: blockIdentifier, hash: '0x123' };
  }

  async getTransaction(hash: Hash): Promise<any> {
    return { hash, from: '0xabc', to: '0xdef' };
  }

  async getTransactionReceipt(hash: Hash): Promise<TransactionReceipt> {
    return { transactionHash: hash, status: 'success' } as TransactionReceipt;
  }

  async waitForTransactionReceipt(
    hash: Hash,
    options?: {
      timeout?: number;
      confirmations?: number;
      pollingInterval?: number;
    },
  ): Promise<TransactionReceipt> {
    return { transactionHash: hash, status: 'success' } as TransactionReceipt;
  }

  async getBalance(address: Address, blockNumber?: bigint): Promise<bigint> {
    return BigInt(1000000000000000000);
  }

  async getTransactionCount(
    address: Address,
    blockNumber?: bigint,
  ): Promise<number> {
    return 42;
  }

  async estimateGas(transaction: any): Promise<bigint> {
    return BigInt(21000);
  }

  async getGasPrice(): Promise<bigint> {
    return BigInt(20000000000);
  }

  async estimateFeesPerGas(): Promise<{
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
  }> {
    return {
      maxFeePerGas: BigInt(30000000000),
      maxPriorityFeePerGas: BigInt(2000000000),
    };
  }

  async call(transaction: any, blockNumber?: bigint): Promise<Hash> {
    return '0x1234567890abcdef' as Hash;
  }

  async getLogs(options: any): Promise<any[]> {
    return [];
  }

  async getTokenBalance(
    tokenAddress: Address,
    accountAddress: Address,
  ): Promise<bigint> {
    return BigInt(1000000000000000000);
  }

  async getTokenInfo(tokenAddress: Address): Promise<{
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: bigint;
  }> {
    return {
      name: 'Test Token',
      symbol: 'TEST',
      decimals: 18,
      totalSupply: BigInt(1000000000000000000000),
    };
  }

  // Private client methods
  async prepareTransaction(
    transaction: any,
    fromAddress: Address,
  ): Promise<any> {
    return {
      ...transaction,
      from: fromAddress,
      gas: BigInt(21000),
      maxFeePerGas: BigInt(30000000000),
      maxPriorityFeePerGas: BigInt(2000000000),
      chainId: 1,
    };
  }

  async sendRawTransaction(signedTransaction: any): Promise<Hash> {
    return '0x1234567890abcdef' as Hash;
  }

  async sendTransactionAndWait(
    signedTransaction: any,
    options?: { timeout?: number; confirmations?: number },
  ): Promise<TransactionReceipt> {
    return {
      transactionHash: '0x123',
      status: 'success',
    } as unknown as TransactionReceipt;
  }

  async cancelTransaction(
    originalTxHash: Hash,
    gasPrice?: bigint,
  ): Promise<Hash> {
    return '0x1234567890abcdef' as Hash;
  }

  async speedUpTransaction(
    originalTxHash: Hash,
    gasPrice?: bigint,
  ): Promise<Hash> {
    return '0x1234567890abcdef' as Hash;
  }
}

describe('BlockchainService', () => {
  let service: BlockchainService;
  let configService: jest.Mocked<ConfigService>;
  let blockchainConfigFactory: jest.Mocked<BlockchainConfigFactory>;
  let chainService: jest.Mocked<ChainService>;
  let mockStrategy: MockBlockchainStrategy;
  let module: TestingModule;

  beforeEach(async () => {
    mockStrategy = new MockBlockchainStrategy();

    configService = BlockchainTestUtils.createMockConfigService({
      BLOCKCHAIN_PROVIDER: 'viem',
      DEFAULT_CHAIN_ID: 1,
    });

    blockchainConfigFactory = {
      createStrategy: vi.fn().mockReturnValue(mockStrategy),
    };

    chainService = BlockchainTestUtils.createMockChainService();

    module = await Test.createTestingModule({
      providers: [
        BlockchainService,
        { provide: ConfigService, useValue: configService },
        { provide: BlockchainConfigFactory, useValue: blockchainConfigFactory },
        { provide: ChainService, useValue: chainService },
      ],
    }).compile();

    service = module.get<BlockchainService>(BlockchainService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('onModuleInit', () => {
    it('should initialize strategy on module init', async () => {
      const initializeSpy = vi.spyOn(mockStrategy, 'initialize');

      await service.onModuleInit();

      expect(blockchainConfigFactory.createStrategy).toHaveBeenCalledWith(
        'viem',
      );
      expect(initializeSpy).toHaveBeenCalledWith(1);
    });

    it('should use default chain ID from config', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'BLOCKCHAIN_PROVIDER') return 'viem';
        if (key === 'DEFAULT_CHAIN_ID') return 1;
        return 'viem'; // default fallback
      });

      const initializeSpy = vi.spyOn(mockStrategy, 'initialize');

      await service.onModuleInit();

      expect(initializeSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('changeStrategy', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should change strategy to different provider', async () => {
      const newMockStrategy = new MockBlockchainStrategy();
      blockchainConfigFactory.createStrategy.mockReturnValue(newMockStrategy);
      const initializeSpy = vi.spyOn(newMockStrategy, 'initialize');

      await service.changeStrategy('ethers' as BlockchainProvider);

      expect(blockchainConfigFactory.createStrategy).toHaveBeenCalledWith(
        'ethers',
      );
      expect(initializeSpy).toHaveBeenCalledWith(1);
    });

    it('should preserve current chain when changing strategy', async () => {
      const newMockStrategy = new MockBlockchainStrategy();
      blockchainConfigFactory.createStrategy.mockReturnValue(newMockStrategy);
      const initializeSpy = vi.spyOn(newMockStrategy, 'initialize');

      await service.changeStrategy('web3' as BlockchainProvider);

      expect(initializeSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('Strategy Interface Methods', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should delegate initialize to strategy', async () => {
      const initializeSpy = vi.spyOn(mockStrategy, 'initialize');

      await service.initialize(1);

      expect(initializeSpy).toHaveBeenCalledWith(1);
    });

    it('should delegate switchChain to strategy', async () => {
      const switchChainSpy = vi.spyOn(mockStrategy, 'switchChain');

      await service.switchChain(1);

      expect(switchChainSpy).toHaveBeenCalledWith(1);
    });

    it('should delegate getCurrentChain to strategy', async () => {
      const getCurrentChainSpy = vi.spyOn(mockStrategy, 'getCurrentChain');

      const result = await service.getCurrentChain();

      expect(getCurrentChainSpy).toHaveBeenCalled();
      expect(result).toEqual({ id: 1, name: 'Polygon' });
    });

    it('should delegate getCurrentChainId to strategy', async () => {
      const getCurrentChainIdSpy = vi.spyOn(mockStrategy, 'getCurrentChainId');

      const result = await service.getCurrentChainId();

      expect(getCurrentChainIdSpy).toHaveBeenCalled();
      expect(result).toBe(1);
    });

    it('should delegate isChainSupported to strategy', () => {
      const isChainSupportedSpy = vi.spyOn(mockStrategy, 'isChainSupported');

      const result = service.isChainSupported(1);

      expect(isChainSupportedSpy).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });
  });

  describe('Public Client Methods', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should delegate getBlockNumber to public client', async () => {
      const getBlockNumberSpy = vi.spyOn(mockStrategy, 'getBlockNumber');

      const result = await service.getBlockNumber();

      expect(getBlockNumberSpy).toHaveBeenCalled();
      expect(result).toBe(BigInt(12345678));
    });

    it('should throw error if public client not initialized', async () => {
      service['publicClient'] = null;

      await expect(service.getBlockNumber()).rejects.toThrow(
        'Blockchain service not initialized',
      );
    });

    it('should throw error if method not available on public client', async () => {
      service['publicClient'] = {} as any;

      await expect(service.getBlockNumber()).rejects.toThrow(
        'getBlockNumber is not a function on publicClient',
      );
    });

    it('should delegate getBlock to public client', async () => {
      const getBlockSpy = vi.spyOn(mockStrategy, 'getBlock');

      const result = await service.getBlock(BigInt(12345678));

      expect(getBlockSpy).toHaveBeenCalledWith(BigInt(12345678));
      expect(result).toEqual({ number: BigInt(12345678), hash: '0x123' });
    });

    it('should delegate getTransaction to public client', async () => {
      const getTransactionSpy = vi.spyOn(mockStrategy, 'getTransaction');

      const result = await service.getTransaction('0x123' as Hash);

      expect(getTransactionSpy).toHaveBeenCalledWith('0x123');
      expect(result).toEqual({ hash: '0x123', from: '0xabc', to: '0xdef' });
    });

    it('should delegate getTransactionReceipt to public client', async () => {
      const getTransactionReceiptSpy = vi.spyOn(
        mockStrategy,
        'getTransactionReceipt',
      );

      const result = await service.getTransactionReceipt('0x123' as Hash);

      expect(getTransactionReceiptSpy).toHaveBeenCalledWith('0x123');
      expect(result).toEqual({ transactionHash: '0x123', status: 'success' });
    });

    it('should delegate waitForTransactionReceipt to public client', async () => {
      const waitForTransactionReceiptSpy = vi.spyOn(
        mockStrategy,
        'waitForTransactionReceipt',
      );

      const result = await service.waitForTransactionReceipt('0x123' as Hash);

      expect(waitForTransactionReceiptSpy).toHaveBeenCalledWith(
        '0x123',
        undefined,
      );
      expect(result).toEqual({ transactionHash: '0x123', status: 'success' });
    });

    it('should delegate getBalance to public client', async () => {
      const getBalanceSpy = vi.spyOn(mockStrategy, 'getBalance');

      const result = await service.getBalance('0x123' as Address);

      expect(getBalanceSpy).toHaveBeenCalledWith('0x123', undefined);
      expect(result).toBe(BigInt(1000000000000000000));
    });

    it('should delegate getTransactionCount to public client', async () => {
      const getTransactionCountSpy = vi.spyOn(
        mockStrategy,
        'getTransactionCount',
      );

      const result = await service.getTransactionCount('0x123' as Address);

      expect(getTransactionCountSpy).toHaveBeenCalledWith('0x123', undefined);
      expect(result).toBe(42);
    });

    it('should delegate estimateGas to public client', async () => {
      const estimateGasSpy = vi.spyOn(mockStrategy, 'estimateGas');

      const tx = BlockchainTestUtils.getMockTransactionData();
      const result = await service.estimateGas(tx);

      expect(estimateGasSpy).toHaveBeenCalledWith(tx);
      expect(result).toBe(BigInt(21000));
    });

    it('should delegate getGasPrice to public client', async () => {
      const getGasPriceSpy = vi.spyOn(mockStrategy, 'getGasPrice');

      const result = await service.getGasPrice();

      expect(getGasPriceSpy).toHaveBeenCalled();
      expect(result).toBe(BigInt(20000000000));
    });

    it('should delegate estimateFeesPerGas to public client', async () => {
      const estimateFeesPerGasSpy = vi.spyOn(
        mockStrategy,
        'estimateFeesPerGas',
      );

      const result = await service.estimateFeesPerGas();

      expect(estimateFeesPerGasSpy).toHaveBeenCalled();
      expect(result).toEqual({
        maxFeePerGas: BigInt(30000000000),
        maxPriorityFeePerGas: BigInt(2000000000),
      });
    });

    it('should delegate call to public client', async () => {
      const callSpy = vi.spyOn(mockStrategy, 'call');

      const tx = BlockchainTestUtils.getMockTransactionData();
      const result = await service.call(tx);

      expect(callSpy).toHaveBeenCalledWith(tx, undefined);
      expect(result).toBe('0x1234567890abcdef');
    });

    it('should delegate getLogs to public client', async () => {
      const getLogsSpy = vi.spyOn(mockStrategy, 'getLogs');

      const options = { address: '0x123' as Address };
      const result = await service.getLogs(options);

      expect(getLogsSpy).toHaveBeenCalledWith(options);
      expect(result).toEqual([]);
    });

    it('should delegate getTokenBalance to public client', async () => {
      const getTokenBalanceSpy = vi.spyOn(mockStrategy, 'getTokenBalance');

      const result = await service.getTokenBalance(
        '0x123' as Address,
        '0xabc' as Address,
      );

      expect(getTokenBalanceSpy).toHaveBeenCalledWith('0x123', '0xabc');
      expect(result).toBe(BigInt(1000000000000000000));
    });

    it('should delegate getTokenInfo to public client', async () => {
      const getTokenInfoSpy = vi.spyOn(mockStrategy, 'getTokenInfo');

      const result = await service.getTokenInfo('0x123' as Address);

      expect(getTokenInfoSpy).toHaveBeenCalledWith('0x123');
      expect(result).toEqual({
        name: 'Test Token',
        symbol: 'TEST',
        decimals: 18,
        totalSupply: BigInt(1000000000000000000000),
      });
    });
  });

  describe('Private Client Methods', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should delegate prepareTransaction to private client', async () => {
      const prepareTransactionSpy = vi.spyOn(
        mockStrategy,
        'prepareTransaction',
      );

      const tx = BlockchainTestUtils.getMockTransactionData();
      const fromAddress = '0x123' as Address;
      const result = await service.prepareTransaction(tx, fromAddress);

      expect(prepareTransactionSpy).toHaveBeenCalledWith(tx, fromAddress);
      expect(result).toEqual({
        ...tx,
        from: fromAddress,
        gas: BigInt(21000),
        maxFeePerGas: BigInt(30000000000),
        maxPriorityFeePerGas: BigInt(2000000000),
        chainId: 1,
      });
    });

    it('should delegate sendRawTransaction to private client', async () => {
      const sendRawTransactionSpy = vi.spyOn(
        mockStrategy,
        'sendRawTransaction',
      );

      const signedTx = BlockchainTestUtils.getMockSignedTransaction();
      const result = await service.sendRawTransaction(signedTx);

      expect(sendRawTransactionSpy).toHaveBeenCalledWith(signedTx);
      expect(result).toBe('0x1234567890abcdef');
    });

    it('should delegate sendTransactionAndWait to private client', async () => {
      const sendTransactionAndWaitSpy = vi.spyOn(
        mockStrategy,
        'sendTransactionAndWait',
      );

      const signedTx = BlockchainTestUtils.getMockSignedTransaction();
      const result = await service.sendTransactionAndWait(signedTx);

      expect(sendTransactionAndWaitSpy).toHaveBeenCalledWith(
        signedTx,
        undefined,
      );
      expect(result).toEqual({ transactionHash: '0x123', status: 'success' });
    });

    it('should delegate cancelTransaction to private client', async () => {
      const cancelTransactionSpy = vi.spyOn(mockStrategy, 'cancelTransaction');

      const result = await service.cancelTransaction('0x123' as Hash);

      expect(cancelTransactionSpy).toHaveBeenCalledWith('0x123', undefined);
      expect(result).toBe('0x1234567890abcdef');
    });

    it('should delegate speedUpTransaction to private client', async () => {
      const speedUpTransactionSpy = vi.spyOn(
        mockStrategy,
        'speedUpTransaction',
      );

      const result = await service.speedUpTransaction('0x123' as Hash);

      expect(speedUpTransactionSpy).toHaveBeenCalledWith('0x123', undefined);
      expect(result).toBe('0x1234567890abcdef');
    });
  });

  describe('Chain Utility Methods', () => {
    it('should delegate getSupportedChains to chain service', () => {
      const getSupportedChainsSpy = vi.spyOn(
        chainService,
        'getSupportedChains',
      );

      const result = service.getSupportedChains();

      expect(getSupportedChainsSpy).toHaveBeenCalled();
      expect(result).toEqual([1, 1, 56]);
    });

    it('should delegate isSupportedChain to chain service', () => {
      const isSupportedChainSpy = vi.spyOn(chainService, 'isSupportedChain');

      const result = service.isSupportedChain(1);

      expect(isSupportedChainSpy).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });

    it('should delegate getChainName to chain service', () => {
      const getChainNameSpy = vi.spyOn(chainService, 'getChainName');

      const result = service.getChainName(1);

      expect(getChainNameSpy).toHaveBeenCalledWith(1);
      expect(result).toBe('Polygon');
    });

    it('should delegate getViemChain to chain service', () => {
      const getViemChainSpy = vi.spyOn(chainService, 'getViemChain');

      const result = service.getViemChain(1);

      expect(getViemChainSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1, name: 'Polygon' });
    });

    it('should delegate getChainExplorer to chain service', () => {
      const getChainExplorerSpy = vi.spyOn(chainService, 'getChainExplorer');

      const result = service.getChainExplorer(1);

      expect(getChainExplorerSpy).toHaveBeenCalledWith(1);
      expect(result).toBe('https://polygonscan.com');
    });

    it('should delegate getChainCurrency to chain service', () => {
      const getChainCurrencySpy = vi.spyOn(chainService, 'getChainCurrency');

      const result = service.getChainCurrency(1);

      expect(getChainCurrencySpy).toHaveBeenCalledWith(1);
      expect(result).toEqual({ name: 'POL', symbol: 'POL', decimals: 18 });
    });
  });

  describe('Provider Utility Methods', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should return provider information', () => {
      const info = service.getProviderInfo();

      expect(info).toEqual({
        provider: 'viem',
        publicClient: true,
        privateClient: true,
      });
    });

    it('should perform health check successfully', async () => {
      const result = await service.healthCheck();

      expect(result).toEqual({
        provider: 'viem',
        healthy: true,
        latency: expect.any(Number),
        chainId: 1,
        blockNumber: BigInt(12345678),
      });
    });

    it('should handle health check failure', async () => {
      vi.spyOn(mockStrategy, 'getCurrentChainId').mockRejectedValue(
        new Error('Connection failed'),
      );

      const result = await service.healthCheck();

      expect(result).toEqual({
        provider: 'viem',
        healthy: false,
        latency: -1,
        chainId: -1,
        blockNumber: BigInt(-1),
      });
    });
  });

  describe('Configuration Validation', () => {
    it('should throw error for invalid blockchain provider', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'BLOCKCHAIN_PROVIDER') return 'invalid';
        return BlockchainTestUtils.createMockConfigService().get(key);
      });

      await expect(service.onModuleInit()).rejects.toThrow(
        'Invalid BLOCKCHAIN_PROVIDER: invalid. Must be one of: viem, ethers, web3, mock',
      );
    });
  });
});
