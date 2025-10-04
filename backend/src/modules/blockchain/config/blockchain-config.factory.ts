import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BlockchainPublicClient,
  BlockchainPrivateClient,
} from '../strategies/blockchain-strategy.interface';
import { ViemBlockchainStrategy } from '../strategies/viem.strategy';
import { ChainService } from '../chain.service';
// Future imports:
// import { EthersBlockchainStrategy } from '../strategies/ethers.strategy';
// import { Web3BlockchainStrategy } from '../strategies/web3.strategy';
// import { MockBlockchainStrategy } from '../strategies/mock.strategy';
import { BlockchainProvider } from '../types';

export interface BlockchainConfigOptions {
  provider: BlockchainProvider;
  config?: {
    defaultChainId?: number;
    timeout?: number;
    retryAttempts?: number;
    // Add provider-specific configs here
    viem?: {
      transportTimeout?: number;
      pollingInterval?: number;
    };
    // ethers?: { ... };
    // web3?: { ... };
  };
}

/**
 * Factory for creating blockchain strategies
 * Similar to our QueueConfigFactory but for blockchain providers
 */
@Injectable()
export class BlockchainConfigFactory {
  private readonly logger = new Logger(BlockchainConfigFactory.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly chainService: ChainService,
  ) {}

  createStrategy(provider: BlockchainProvider): BlockchainPublicClient {
    // & BlockchainPrivateClient
    const options: BlockchainConfigOptions = {
      provider,
      config: this.loadProviderConfig(provider),
    };

    this.logger.log(`Creating blockchain strategy: ${provider}`);

    switch (provider) {
      case 'viem':
        return this.createViemStrategy(options);

      case 'ethers':
        return this.createEthersStrategy(options);

      case 'web3':
        return this.createWeb3Strategy(options);

      case 'mock':
        return this.createMockStrategy(options);

      default:
        throw new Error(`Unsupported blockchain provider: ${provider}`);
    }
  }

  private createViemStrategy(
    options: BlockchainConfigOptions,
  ): ViemBlockchainStrategy {
    this.logger.debug('Creating Viem blockchain strategy');

    // Viem strategy handles its own configuration via environment variables
    // and the existing transport configuration
    return new ViemBlockchainStrategy(this.configService, this.chainService);
  }

  private createEthersStrategy(options: BlockchainConfigOptions): any {
    // TODO: Implement Ethers strategy
    throw new Error('Ethers strategy not implemented yet');

    // this.logger.debug('Creating Ethers blockchain strategy');
    // return new EthersBlockchainStrategy(options.config?.ethers);
  }

  private createWeb3Strategy(options: BlockchainConfigOptions): any {
    // TODO: Implement Web3 strategy
    throw new Error('Web3 strategy not implemented yet');

    // this.logger.debug('Creating Web3 blockchain strategy');
    // return new Web3BlockchainStrategy(options.config?.web3);
  }

  private createMockStrategy(options: BlockchainConfigOptions): any {
    // TODO: Implement Mock strategy for testing
    throw new Error('Mock strategy not implemented yet');

    // this.logger.debug('Creating Mock blockchain strategy');
    // return new MockBlockchainStrategy();
  }

  private loadProviderConfig(provider: BlockchainProvider): any {
    const baseConfig = {
      defaultChainId: this.configService.get<number>('DEFAULT_CHAIN_ID', 137),
      timeout: this.configService.get<number>('BLOCKCHAIN_TIMEOUT', 30000),
      retryAttempts: this.configService.get<number>(
        'BLOCKCHAIN_RETRY_ATTEMPTS',
        3,
      ),
    };

    switch (provider) {
      case 'viem':
        return {
          ...baseConfig,
          viem: {
            transportTimeout: this.configService.get<number>(
              'VIEM_TRANSPORT_TIMEOUT',
              10000,
            ),
            pollingInterval: this.configService.get<number>(
              'VIEM_POLLING_INTERVAL',
              1000,
            ),
          },
        };

      case 'ethers':
        return {
          ...baseConfig,
          ethers: {
            // Ethers-specific config
            providerTimeout: this.configService.get<number>(
              'ETHERS_PROVIDER_TIMEOUT',
              10000,
            ),
          },
        };

      case 'web3':
        return {
          ...baseConfig,
          web3: {
            // Web3-specific config
            httpTimeout: this.configService.get<number>(
              'WEB3_HTTP_TIMEOUT',
              10000,
            ),
          },
        };

      case 'mock':
        return {
          ...baseConfig,
          mock: {
            // Mock-specific config
            simulateLatency: this.configService.get<boolean>(
              'MOCK_SIMULATE_LATENCY',
              true,
            ),
            failureRate: this.configService.get<number>(
              'MOCK_FAILURE_RATE',
              0.1,
            ),
          },
        };

      default:
        return baseConfig;
    }
  }

  /**
   * Helper method to get provider from environment
   */
  static getProviderFromConfig(
    configService: ConfigService,
  ): BlockchainProvider {
    const provider = configService
      .get('BLOCKCHAIN_PROVIDER', 'viem')
      .toLowerCase();

    if (!['viem', 'ethers', 'web3', 'mock'].includes(provider)) {
      throw new Error(
        `Invalid BLOCKCHAIN_PROVIDER: ${provider}. Must be one of: viem, ethers, web3, mock`,
      );
    }

    return provider as BlockchainProvider;
  }

  /**
   * Validate provider configuration
   */
  validateConfig(provider: BlockchainProvider): void {
    const requiredEnvVars: Record<BlockchainProvider, string[]> = {
      viem: ['DEFAULT_CHAIN_ID'],
      ethers: ['DEFAULT_CHAIN_ID'],
      web3: ['DEFAULT_CHAIN_ID'],
      mock: [], // Mock doesn't require any environment variables
    };

    const required = requiredEnvVars[provider] || [];
    const missing = required.filter((key) => !this.configService.get(key));

    if (missing.length > 0) {
      throw new Error(
        `Missing required configuration for ${provider}: ${missing.join(', ')}`,
      );
    }

    this.logger.debug(`Configuration validated for ${provider} provider`);
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): BlockchainProvider[] {
    return ['viem', 'ethers', 'web3', 'mock'];
  }

  /**
   * Check if provider is available/implemented
   */
  isProviderImplemented(provider: BlockchainProvider): boolean {
    try {
      // Try to create the strategy to see if it's implemented
      this.createStrategy(provider);
      return true;
    } catch (error) {
      if (error.message.includes('not implemented')) {
        return false;
      }
      // If it's a different error, the provider is implemented but misconfigured
      return true;
    }
  }
}
