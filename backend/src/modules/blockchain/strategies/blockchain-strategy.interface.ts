import { Hash, Address, TransactionReceipt, Chain, AbiEvent, Log } from 'viem';
import { SupportedChains } from '../types';
import {
  UnsignedCalldata,
  UnsignedCalldataWithGas,
  SignedTransaction,
} from '../types/module-interop.types';

/**
 * Abstract blockchain strategy interface
 * This allows us to swap between different blockchain libraries (Viem, Ethers, Web3, etc.)
 */
export interface BlockchainStrategy {
  /**
   * Initialize the strategy with a specific chain
   */
  initialize(chainId?: SupportedChains): Promise<void>;

  /**
   * Switch to a different blockchain network
   */
  switchChain(chainId: SupportedChains): Promise<void>;

  /**
   * Get current chain information
   */
  getCurrentChain(): Promise<Chain>;

  /**
   * Get current chain ID
   */
  getCurrentChainId(): Promise<SupportedChains>;

  /**
   * Check if the strategy supports a specific chain
   */
  isChainSupported(chainId: SupportedChains): boolean;
}

/**
 * Public client interface - Read-only blockchain operations
 */
export interface BlockchainPublicClient extends BlockchainStrategy {
  /**
   * Get the latest block number
   */
  getBlockNumber(): Promise<bigint>;

  /**
   * Get block information by number or hash
   */
  getBlock(blockIdentifier: bigint | Hash): Promise<any>;

  /**
   * Get transaction information by hash
   */
  getTransaction(hash: Hash): Promise<any>;

  /**
   * Get transaction receipt
   */
  getTransactionReceipt(hash: Hash): Promise<TransactionReceipt>;

  /**
   * Wait for transaction to be mined
   */
  waitForTransactionReceipt(
    hash: Hash,
    options?: {
      timeout?: number;
      confirmations?: number;
      pollingInterval?: number;
    },
  ): Promise<TransactionReceipt>;

  /**
   * Get account balance (native token)
   */
  getBalance(address: Address, blockNumber?: bigint): Promise<bigint>;

  /**
   * Get account nonce
   */
  getTransactionCount(address: Address, blockNumber?: bigint): Promise<number>;

  /**
   * Estimate gas for a transaction
   */
  estimateGas(transaction: UnsignedCalldata): Promise<bigint>;

  /**
   * Get current gas price
   */
  getGasPrice(): Promise<bigint>;

  /**
   * Get EIP-1559 fee data
   */
  estimateFeesPerGas(): Promise<{
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
  }>;

  /**
   * Call a contract method (read-only)
   */
  call(transaction: UnsignedCalldata, blockNumber?: bigint): Promise<Hash>;

  /**
   * Get contract logs/events
   */
  getLogs(options: {
    address?: Address | Address[];
    topics?: Hash[][];
    fromBlock?: bigint;
    toBlock?: bigint;
    eventType?: AbiEvent;
  }): Promise<Log[]>;

  /**
   * Get ERC-20 token balance
   */
  getTokenBalance(
    tokenAddress: Address,
    accountAddress: Address,
  ): Promise<bigint>;

  /**
   * Get ERC-20 token information
   */
  getTokenInfo(tokenAddress: Address): Promise<{
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: bigint;
  }>;
}

/**
 * Private client interface - Write operations to blockchain
 */
export interface BlockchainPrivateClient extends BlockchainPublicClient {
  /**
   * Prepare transaction with gas estimation and fee calculation
   */
  prepareTransaction(
    transaction: UnsignedCalldata,
    fromAddress: Address,
  ): Promise<UnsignedCalldataWithGas>;

  /**
   * Send a raw signed transaction
   */
  sendRawTransaction(signedTransaction: SignedTransaction): Promise<Hash>;

  /**
   * Send a signed transaction and wait for receipt
   */
  sendTransactionAndWait(
    signedTransaction: SignedTransaction,
    options?: {
      timeout?: number;
      confirmations?: number;
    },
  ): Promise<TransactionReceipt>;

  /**
   * Cancel/replace a pending transaction
   */
  cancelTransaction(originalTxHash: Hash, gasPrice?: bigint): Promise<Hash>;

  /**
   * Speed up a pending transaction
   */
  speedUpTransaction(originalTxHash: Hash, gasPrice?: bigint): Promise<Hash>;
}

/**
 * Error handling interface for blockchain operations
 */
export interface BlockchainErrorHandler {
  /**
   * Determine if an error is retryable
   */
  isRetryableError(error: Error): boolean;

  /**
   * Determine if client should be changed due to error
   */
  shouldChangeProvider(error: Error): boolean;

  /**
   * Get retry delay for specific error
   */
  getRetryDelay(error: Error, attemptNumber: number): number;

  /**
   * Handle provider switch
   */
  switchProvider(): Promise<void>;
}

/**
 * Provider health checking interface
 */
export interface BlockchainProviderHealth {
  /**
   * Check if current provider is healthy
   */
  isProviderHealthy(): Promise<boolean>;

  /**
   * Get provider latency
   */
  getProviderLatency(): Promise<number>;

  /**
   * Get provider name/identifier
   */
  getProviderName(): string;

  /**
   * Get all available providers
   */
  getAvailableProviders(): string[];
}
