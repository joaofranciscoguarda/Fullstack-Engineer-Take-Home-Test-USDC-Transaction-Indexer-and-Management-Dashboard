import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BlockchainConfigFactory,
  BlockchainConfigOptions,
} from '../config/blockchain-config.factory';
import { ChainService } from '../chain.service';
import { ViemBlockchainStrategy } from '../strategies/viem.strategy';
import { BlockchainProvider } from '../types';
import { BlockchainTestUtils } from './test-utils';
import { vi } from 'vitest';

// Mock the ViemBlockchainStrategy
vi.mock('../strategies/viem.strategy');
const MockedViemBlockchainStrategy = ViemBlockchainStrategy as any;

describe('BlockchainConfigFactory', () => {
  let factory: BlockchainConfigFactory;
  let configService: any;
  let chainService: any;
  let module: TestingModule;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    configService = BlockchainTestUtils.createMockConfigService({
      BLOCKCHAIN_PROVIDER: 'viem',
      DEFAULT_CHAIN_ID: 1,
      BLOCKCHAIN_TIMEOUT: 30000,
      BLOCKCHAIN_RETRY_ATTEMPTS: 3,
      VIEM_TRANSPORT_TIMEOUT: 10000,
      VIEM_POLLING_INTERVAL: 1000,
      ETHERS_PROVIDER_TIMEOUT: 10000,
      WEB3_HTTP_TIMEOUT: 10000,
      MOCK_SIMULATE_LATENCY: true,
      MOCK_FAILURE_RATE: 0.1,
    });

    chainService = BlockchainTestUtils.createMockChainService();

    // Mock ViemBlockchainStrategy constructor
    MockedViemBlockchainStrategy.mockImplementation(() => ({}));

    module = await Test.createTestingModule({
      providers: [
        BlockchainConfigFactory,
        { provide: ConfigService, useValue: configService },
        { provide: ChainService, useValue: chainService },
      ],
    }).compile();

    factory = module.get<BlockchainConfigFactory>(BlockchainConfigFactory);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('createStrategy', () => {
    it('should create Viem strategy successfully', () => {
      const strategy = factory.createStrategy('viem');

      expect(MockedViemBlockchainStrategy).toHaveBeenCalledWith(
        configService,
        chainService,
      );
      expect(strategy).toBeDefined();
    });

    it('should throw error for unsupported provider', () => {
      expect(() =>
        factory.createStrategy('unsupported' as BlockchainProvider),
      ).toThrow('Unsupported blockchain provider: unsupported');
    });

    it('should throw error for unimplemented Ethers strategy', () => {
      expect(() => factory.createStrategy('ethers')).toThrow(
        'Ethers strategy not implemented yet',
      );
    });

    it('should throw error for unimplemented Web3 strategy', () => {
      expect(() => factory.createStrategy('web3')).toThrow(
        'Web3 strategy not implemented yet',
      );
    });

    it('should throw error for unimplemented Mock strategy', () => {
      expect(() => factory.createStrategy('mock')).toThrow(
        'Mock strategy not implemented yet',
      );
    });

    it('should log strategy creation', () => {
      const loggerSpy = vi.spyOn(factory['logger'], 'log');

      factory.createStrategy('viem');

      expect(loggerSpy).toHaveBeenCalledWith(
        'Creating blockchain strategy: viem',
      );
    });

    it('should log debug message for Viem strategy', () => {
      const loggerSpy = vi.spyOn(factory['logger'], 'debug');

      factory.createStrategy('viem');

      expect(loggerSpy).toHaveBeenCalledWith(
        'Creating Viem blockchain strategy',
      );
    });
  });

  describe('loadProviderConfig', () => {
    it('should load Viem configuration', () => {
      const config = factory['loadProviderConfig']('viem');

      expect(config).toEqual({
        defaultChainId: 1,
        timeout: 30000,
        retryAttempts: 3,
        viem: {
          transportTimeout: 10000,
          pollingInterval: 1000,
        },
      });
    });

    it('should load Ethers configuration', () => {
      const config = factory['loadProviderConfig']('ethers');

      expect(config).toEqual({
        defaultChainId: 1,
        timeout: 30000,
        retryAttempts: 3,
        ethers: {
          providerTimeout: 10000,
        },
      });
    });

    it('should load Web3 configuration', () => {
      const config = factory['loadProviderConfig']('web3');

      expect(config).toEqual({
        defaultChainId: 1,
        timeout: 30000,
        retryAttempts: 3,
        web3: {
          httpTimeout: 10000,
        },
      });
    });

    it('should load Mock configuration', () => {
      const config = factory['loadProviderConfig']('mock');

      expect(config).toEqual({
        defaultChainId: 1,
        timeout: 30000,
        retryAttempts: 3,
        mock: {
          simulateLatency: true,
          failureRate: 0.1,
        },
      });
    });

    it('should use default values when config not provided', () => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          // Return undefined for all keys to test defaults
          return defaultValue;
        },
      );

      const config = factory['loadProviderConfig']('viem');

      expect(config).toEqual({
        defaultChainId: 1,
        timeout: 30000,
        retryAttempts: 3,
        viem: {
          transportTimeout: 10000,
          pollingInterval: 1000,
        },
      });
    });

    it('should return base config for unknown provider', () => {
      const config = factory['loadProviderConfig'](
        'unknown' as BlockchainProvider,
      );

      expect(config).toEqual({
        defaultChainId: 1,
        timeout: 30000,
        retryAttempts: 3,
      });
    });
  });

  describe('getProviderFromConfig', () => {
    it('should return provider from config service', () => {
      const provider =
        BlockchainConfigFactory.getProviderFromConfig(configService);

      expect(provider).toBe('viem');
      expect(configService.get).toHaveBeenCalledWith(
        'BLOCKCHAIN_PROVIDER',
        'viem',
      );
    });

    it('should return default provider when not configured', () => {
      configService.get.mockReturnValue('viem'); // Return the default value

      const provider =
        BlockchainConfigFactory.getProviderFromConfig(configService);

      expect(provider).toBe('viem');
    });

    it('should handle case insensitive provider names', () => {
      configService.get.mockReturnValue('VIEM');

      const provider =
        BlockchainConfigFactory.getProviderFromConfig(configService);

      expect(provider).toBe('viem');
    });

    it('should throw error for invalid provider', () => {
      configService.get.mockReturnValue('invalid');

      expect(() =>
        BlockchainConfigFactory.getProviderFromConfig(configService),
      ).toThrow(
        'Invalid BLOCKCHAIN_PROVIDER: invalid. Must be one of: viem, ethers, web3, mock',
      );
    });

    it('should accept all valid providers', () => {
      const validProviders = ['viem', 'ethers', 'web3', 'mock'];

      validProviders.forEach((provider) => {
        configService.get.mockReturnValue(provider);

        expect(() =>
          BlockchainConfigFactory.getProviderFromConfig(configService),
        ).not.toThrow();
      });
    });
  });

  describe('validateConfig', () => {
    it('should validate Viem configuration successfully', () => {
      expect(() => factory.validateConfig('viem')).not.toThrow();
    });

    it('should validate Ethers configuration successfully', () => {
      expect(() => factory.validateConfig('ethers')).not.toThrow();
    });

    it('should validate Web3 configuration successfully', () => {
      expect(() => factory.validateConfig('web3')).not.toThrow();
    });

    it('should validate Mock configuration successfully', () => {
      expect(() => factory.validateConfig('mock')).not.toThrow();
    });

    it('should throw error for missing required configuration', () => {
      configService.get.mockReturnValue(undefined);

      expect(() => factory.validateConfig('viem')).toThrow(
        'Missing required configuration for viem: DEFAULT_CHAIN_ID',
      );
    });

    it('should log debug message on successful validation', () => {
      const loggerSpy = vi.spyOn(factory['logger'], 'debug');

      factory.validateConfig('viem');

      expect(loggerSpy).toHaveBeenCalledWith(
        'Configuration validated for viem provider',
      );
    });

    it('should handle unknown provider gracefully', () => {
      expect(() =>
        factory.validateConfig('unknown' as BlockchainProvider),
      ).not.toThrow();
    });
  });

  describe('getAvailableProviders', () => {
    it('should return list of available providers', () => {
      const providers = factory.getAvailableProviders();

      expect(providers).toEqual(['viem', 'ethers', 'web3', 'mock']);
    });

    it('should return array of correct type', () => {
      const providers = factory.getAvailableProviders();

      expect(Array.isArray(providers)).toBe(true);
      expect(providers).toHaveLength(4);
    });
  });

  describe('isProviderImplemented', () => {
    it('should return true for implemented Viem provider', () => {
      const isImplemented = factory.isProviderImplemented('viem');

      expect(isImplemented).toBe(true);
    });

    it('should return false for unimplemented Ethers provider', () => {
      const isImplemented = factory.isProviderImplemented('ethers');

      expect(isImplemented).toBe(false);
    });

    it('should return false for unimplemented Web3 provider', () => {
      const isImplemented = factory.isProviderImplemented('web3');

      expect(isImplemented).toBe(false);
    });

    it('should return false for unimplemented Mock provider', () => {
      const isImplemented = factory.isProviderImplemented('mock');

      expect(isImplemented).toBe(false);
    });

    it('should return true for implemented provider with configuration error', () => {
      // Mock createStrategy to throw a non-implementation error
      vi.spyOn(factory, 'createStrategy').mockImplementation(() => {
        throw new Error('Configuration error');
      });

      const isImplemented = factory.isProviderImplemented('viem');

      expect(isImplemented).toBe(true);
    });
  });

  describe('integration tests', () => {
    it('should create and configure Viem strategy correctly', () => {
      const strategy = factory.createStrategy('viem');

      expect(MockedViemBlockchainStrategy).toHaveBeenCalledWith(
        configService,
        chainService,
      );
      expect(strategy).toBeDefined();
    });

    it('should handle configuration loading for all providers', () => {
      const providers: BlockchainProvider[] = [
        'viem',
        'ethers',
        'web3',
        'mock',
      ];

      providers.forEach((provider) => {
        expect(() => factory['loadProviderConfig'](provider)).not.toThrow();
      });
    });

    it('should validate configuration for all providers', () => {
      const providers: BlockchainProvider[] = [
        'viem',
        'ethers',
        'web3',
        'mock',
      ];

      providers.forEach((provider) => {
        expect(() => factory.validateConfig(provider)).not.toThrow();
      });
    });
  });

  describe('error handling', () => {
    it('should handle config service errors gracefully', () => {
      configService.get.mockImplementation(() => {
        throw new Error('Config service error');
      });

      expect(() => factory['loadProviderConfig']('viem')).toThrow(
        'Config service error',
      );
    });

    it('should handle chain service errors gracefully', () => {
      chainService.getSupportedChains.mockImplementation(() => {
        throw new Error('Chain service error');
      });

      // This should not throw since we're not using chainService in createStrategy for Viem
      expect(() => factory.createStrategy('viem')).not.toThrow();
    });
  });

  describe('configuration edge cases', () => {
    it('should handle empty configuration values', () => {
      configService.get.mockReturnValue('');

      expect(() => factory.validateConfig('viem')).toThrow(
        'Missing required configuration for viem: DEFAULT_CHAIN_ID',
      );
    });

    it('should handle null configuration values', () => {
      configService.get.mockReturnValue(null);

      expect(() => factory.validateConfig('viem')).toThrow(
        'Missing required configuration for viem: DEFAULT_CHAIN_ID',
      );
    });

    it('should handle undefined configuration values', () => {
      configService.get.mockReturnValue(undefined);

      expect(() => factory.validateConfig('viem')).toThrow(
        'Missing required configuration for viem: DEFAULT_CHAIN_ID',
      );
    });
  });

  describe('performance tests', () => {
    it('should create strategies efficiently', () => {
      const startTime = Date.now();

      // Create multiple strategies
      for (let i = 0; i < 100; i++) {
        factory.createStrategy('viem');
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should validate configurations efficiently', () => {
      const startTime = Date.now();

      // Validate multiple configurations
      for (let i = 0; i < 1000; i++) {
        factory.validateConfig('viem');
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
