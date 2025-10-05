import { registerAs } from '@nestjs/config';
import { mainnet, sepolia } from 'viem/chains';
import { BlockchainConfigInterface } from '@/modules/blockchain/types/blockchain-config.types';

export default registerAs('blockchain', (): BlockchainConfigInterface => {
  // Helper function to safely get env vars
  const getEnvVar = (key: string, defaultValue?: string): string => {
    const value = process.env[key];
    if (!value && !defaultValue) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value || defaultValue!;
  };

  // Helper function to get optional env vars
  const getOptionalEnvVar = (key: string, defaultValue: string): string => {
    return process.env[key] || defaultValue;
  };

  const config: BlockchainConfigInterface = {
    // Global blockchain settings
    defaultChainId: parseInt(getOptionalEnvVar('DEFAULT_CHAIN_ID', '1'), 10),
    defaultProvider: getEnvVar('DEFAULT_BLOCKCHAIN_PROVIDER', 'viem'),
    timeout: parseInt(getOptionalEnvVar('BLOCKCHAIN_TIMEOUT', '30000'), 10),
    retryAttempts: parseInt(
      getOptionalEnvVar('BLOCKCHAIN_RETRY_ATTEMPTS', '3'),
      10,
    ),
    confirmations: parseInt(
      getOptionalEnvVar('BLOCKCHAIN_DEFAULT_CONFIRMATIONS', '2'),
      10,
    ),

    // Chain-specific configurations
    chains: {
      // Ethereum Mainnet
      [mainnet.id]: {
        ...mainnet, // Use Viem's chain object directly
        defaultProvider: 'default',
        // Indexer start block (defaults to ~1 month ago: block 20,800,000)
        // USDC contract was deployed at block 6,082,465, but starting from recent block is recommended
        indexerStartBlock: BigInt(
          getOptionalEnvVar('1_INDEXER_START_BLOCK', '20800000'),
        ),
        providers: [
          {
            name: 'Default Mainnet RPC',
            transport: mainnet.rpcUrls.default.http[0], // Use Viem's default RPC
            blockRange: 50n, // Aligned with chunk size manager
            timeout: 30000, // Increased timeout
            retryAttempts: 5, // More retries
          },
          // Additional RPC providers (optional, will be filtered if not configured)
          ...(process.env['1_1_TRANSPORT']
            ? [
                {
                  name: '1 Mainnet',
                  transport: process.env['1_1_TRANSPORT'],
                  blockRange: 50n, // Aligned with chunk size manager
                  timeout: 30000,
                  retryAttempts: 5,
                },
              ]
            : []),
          ...(process.env['1_2_TRANSPORT']
            ? [
                {
                  name: '2 Mainnet',
                  transport: process.env['1_2_TRANSPORT'],
                  blockRange: 50n, // Aligned with chunk size manager
                  timeout: 30000,
                  retryAttempts: 5,
                },
              ]
            : []),
          ...(process.env['1_3_TRANSPORT']
            ? [
                {
                  name: '3 Mainnet',
                  transport: process.env['1_3_TRANSPORT'],
                  blockRange: 50n, // Aligned with chunk size manager
                  timeout: 30000,
                  retryAttempts: 5,
                },
              ]
            : []),
          ...(process.env['1_4_TRANSPORT']
            ? [
                {
                  name: '4 Mainnet',
                  transport: process.env['1_4_TRANSPORT'],
                  blockRange: 50n, // Aligned with chunk size manager
                  timeout: 30000,
                  retryAttempts: 5,
                },
              ]
            : []),
        ],
      },

      // Ethereum Sepolia Testnet
      [sepolia.id]: {
        ...sepolia, // Use Viem's chain object directly
        defaultProvider: 'default',
        // Indexer start block for Sepolia (defaults to a recent block)
        indexerStartBlock: BigInt(
          getOptionalEnvVar('11155111_INDEXER_START_BLOCK', '7000000'),
        ),
        providers: [
          {
            name: 'Default Sepolia RPC',
            transport: sepolia.rpcUrls.default.http[0], // Use Viem's default RPC
            blockRange: 10_000_000n,
            timeout: 15000,
            retryAttempts: 3,
          },
          // Uncomment and add API keys when needed for higher usage
          // {
          //     name: 'Infura Sepolia',
          //     transport: getEnvVar('SEPOLIA_INFURA_TRANSPORT'),
          //     blockRange: 10_000_000n,
          //     timeout: 15000,
          //     retryAttempts: 3,
          // },
          // {
          //     name: 'Alchemy Sepolia',
          //     transport: getEnvVar('SEPOLIA_ALCHEMY_TRANSPORT'),
          //     blockRange: 8000n,
          //     timeout: 12000,
          //     retryAttempts: 3,
          // },
        ],
      },
    },
  };

  return config;
});

// Re-export types for backward compatibility
export type {
  BlockchainProviderConfig,
  ChainConfig,
  BlockchainConfigInterface as BlockchainConfig,
} from '../modules/blockchain/types/blockchain-config.types';
