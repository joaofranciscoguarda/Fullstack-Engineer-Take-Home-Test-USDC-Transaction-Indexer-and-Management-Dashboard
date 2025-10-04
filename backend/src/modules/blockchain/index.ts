// Main module and service
export { BlockchainModule } from './blockchain.module';
export { BlockchainService } from './blockchain.service';

// Configuration
export { BlockchainConfigFactory } from './config/blockchain-config.factory';

// Strategies and interfaces
export { AbstractBlockchainStrategy } from './strategies/abstract-blockchain.strategy';
export { ViemBlockchainStrategy } from './strategies/viem.strategy';
export type {
  BlockchainStrategy,
  BlockchainPublicClient,
  BlockchainPrivateClient,
  BlockchainErrorHandler,
  BlockchainProviderHealth,
} from './strategies/blockchain-strategy.interface';

// Types and utilities
export * from './types';
