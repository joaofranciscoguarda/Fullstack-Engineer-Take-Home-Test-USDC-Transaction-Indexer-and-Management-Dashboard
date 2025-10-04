import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BlockchainService } from './blockchain.service';
import { BlockchainConfigFactory } from './config/blockchain-config.factory';
import { ViemBlockchainStrategy } from './strategies/viem.strategy';
import { ChainService } from './chain.service';
import blockchainConfig from '../../config/blockchain.config';

// Future strategy imports:
// import { EthersBlockchainStrategy } from './strategies/ethers.strategy';
// import { Web3BlockchainStrategy } from './strategies/web3.strategy';
// import { MockBlockchainStrategy } from './strategies/mock.strategy';

@Module({})
export class BlockchainModule {
  static forRoot(): DynamicModule {
    return {
      module: BlockchainModule,
      imports: [ConfigModule.forFeature(blockchainConfig)],
      providers: [
        ChainService,
        BlockchainService,
        BlockchainConfigFactory,
        // Always include available strategies
        ViemBlockchainStrategy,
        // Future strategies:
        // EthersBlockchainStrategy,
        // Web3BlockchainStrategy,
        // MockBlockchainStrategy,
      ],
      exports: [BlockchainService],
      global: false,
    };
  }

  /**
   * For feature modules that need blockchain functionality
   */
  static forFeature(): DynamicModule {
    return {
      module: BlockchainModule,
      imports: [ConfigModule.forFeature(blockchainConfig)],
      providers: [
        ChainService,
        BlockchainService,
        BlockchainConfigFactory,
        ViemBlockchainStrategy,
      ],
      exports: [BlockchainService],
    };
  }
}
