import { Chain } from 'viem';
import { mainnet, sepolia } from 'viem/chains';

// Blockchain provider configuration
export interface BlockchainProviderConfig {
  name: string;
  transport: string;
  blockRange: bigint;
  timeout?: number;
  retryAttempts?: number;
}

// Extended chain configuration with providers
export interface ChainConfig extends Chain {
  providers: BlockchainProviderConfig[];
  defaultProvider?: string;
  indexerStartBlock?: bigint; // Starting block for indexing (can be overridden via env vars)
}

// Main blockchain configuration interface
export interface BlockchainConfigInterface {
  defaultChainId: number;
  defaultProvider: string;
  timeout: number;
  retryAttempts: number;
  confirmations: number;
  chains: Record<SupportedChains, ChainConfig>;
}

// Supported chain IDs type
export type SupportedChains = 1 | 11155111; // Ethereum Mainnet, Sepolia

// Centralized list of supported Viem chains
export const SUPPORTED_VIEM_CHAINS = [mainnet, sepolia] as const;

export type BlockchainProvider = 'viem' | 'ethers' | 'web3' | 'mock';
