import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Hash, Address, TransactionReceipt, Chain, AbiEvent, Log } from 'viem';
import { SupportedChains, BlockchainProvider } from './types';
import {
  UnsignedCalldata,
  UnsignedCalldataWithGas,
  SignedTransaction,
} from './types/module-interop.types';
import {
  BlockchainPublicClient,
  BlockchainPrivateClient,
} from './strategies/blockchain-strategy.interface';
import { BlockchainConfigFactory } from './config/blockchain-config.factory';
import { ChainService } from './chain.service';

/**
 * Main Blockchain Service
 * Acts as a facade for blockchain operations, routing to the appropriate strategy
 */
@Injectable()
export class BlockchainService
  implements OnModuleInit, BlockchainPublicClient, BlockchainPrivateClient
{
  private readonly logger = new Logger(BlockchainService.name);
  private publicClient: BlockchainPublicClient;
  private privateClient: BlockchainPrivateClient;
  private currentProvider: BlockchainProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly blockchainConfigFactory: BlockchainConfigFactory,
    private readonly chainService: ChainService,
  ) {}

  async onModuleInit() {
    await this.initializeStrategy();
  }

  private async initializeStrategy(): Promise<void> {
    this.currentProvider = this.getProviderFromConfig();

    this.logger.log(
      `Initializing blockchain service with provider: ${this.currentProvider}`,
    );

    const strategy = this.blockchainConfigFactory.createStrategy(
      this.currentProvider,
    );

    // For now, same strategy handles both public and private operations
    // In future, you might want separate strategies for different key management
    this.publicClient = strategy;
    // this.privateClient = strategy;

    // Initialize with default chain
    const defaultChainId = Number(
      this.configService.get<string>('DEFAULT_CHAIN_ID', '11155111'),
    ) as SupportedChains;
    await strategy.initialize(defaultChainId);

    this.logger.log(`Blockchain service initialized successfully`);
  }

  private getProviderFromConfig(): BlockchainProvider {
    const provider = this.configService
      .get<string>('BLOCKCHAIN_PROVIDER', 'viem')
      .toLowerCase();

    if (!['viem', 'ethers', 'web3', 'mock'].includes(provider)) {
      throw new Error(
        `Invalid BLOCKCHAIN_PROVIDER: ${provider}. Must be one of: viem, ethers, web3, mock`,
      );
    }

    return provider as BlockchainProvider;
  }

  /**
   * Change blockchain strategy at runtime - useful for testing or provider switching
   */
  async changeStrategy(provider: BlockchainProvider): Promise<void> {
    this.logger.log(
      `Switching blockchain provider from ${this.currentProvider} to ${provider}`,
    );

    const currentChainId = await this.getCurrentChainId();

    const newStrategy = this.blockchainConfigFactory.createStrategy(provider);
    await newStrategy.initialize(currentChainId);

    this.publicClient = newStrategy;
    // this.privateClient = newStrategy;
    this.currentProvider = provider;

    this.logger.log(`Successfully switched to ${provider} provider`);
  }

  // ====================== Strategy Interface Methods ======================

  async initialize(chainId?: SupportedChains): Promise<void> {
    return this.publicClient.initialize(chainId);
  }

  async switchChain(chainId: SupportedChains): Promise<void> {
    return this.publicClient.switchChain(chainId);
  }

  async getCurrentChain() {
    return this.publicClient.getCurrentChain();
  }

  async getCurrentChainId(): Promise<SupportedChains> {
    return this.publicClient.getCurrentChainId();
  }

  isChainSupported(chainId: SupportedChains): boolean {
    return this.publicClient.isChainSupported(chainId);
  }

  // ====================== Public Client Methods ======================

  async getBlockNumber(): Promise<bigint> {
    if (!this.publicClient) {
      throw new Error('Blockchain service not initialized');
    }
    if (typeof this.publicClient.getBlockNumber !== 'function') {
      throw new Error(
        `getBlockNumber is not a function on publicClient. Available methods: ${Object.getOwnPropertyNames(this.publicClient)}`,
      );
    }
    return this.publicClient.getBlockNumber();
  }

  async getBlock(blockIdentifier: bigint | Hash) {
    return this.publicClient.getBlock(blockIdentifier);
  }

  async getTransaction(hash: Hash) {
    return this.publicClient.getTransaction(hash);
  }

  async getTransactionReceipt(hash: Hash): Promise<TransactionReceipt> {
    return this.publicClient.getTransactionReceipt(hash);
  }

  async waitForTransactionReceipt(
    hash: Hash,
    options?: {
      timeout?: number;
      confirmations?: number;
      pollingInterval?: number;
    },
  ): Promise<TransactionReceipt> {
    return this.publicClient.waitForTransactionReceipt(hash, options);
  }

  async getBalance(address: Address, blockNumber?: bigint): Promise<bigint> {
    return this.publicClient.getBalance(address, blockNumber);
  }

  async getTransactionCount(
    address: Address,
    blockNumber?: bigint,
  ): Promise<number> {
    return this.publicClient.getTransactionCount(address, blockNumber);
  }

  async estimateGas(transaction: UnsignedCalldata): Promise<bigint> {
    return this.publicClient.estimateGas(transaction);
  }

  async getGasPrice(): Promise<bigint> {
    return this.publicClient.getGasPrice();
  }

  async estimateFeesPerGas(): Promise<{
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
  }> {
    return this.publicClient.estimateFeesPerGas();
  }

  async call(
    transaction: UnsignedCalldata,
    blockNumber?: bigint,
  ): Promise<Hash> {
    return this.publicClient.call(transaction, blockNumber);
  }

  async getLogs(options: {
    address?: Address | Address[];
    topics?: Hash[][];
    fromBlock?: bigint;
    toBlock?: bigint;
    eventType?: AbiEvent;
  }): Promise<Log[]> {
    return this.publicClient.getLogs(options);
  }

  async getTokenBalance(
    tokenAddress: Address,
    accountAddress: Address,
  ): Promise<bigint> {
    return this.publicClient.getTokenBalance(tokenAddress, accountAddress);
  }

  async getTokenInfo(tokenAddress: Address): Promise<{
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: bigint;
  }> {
    return this.publicClient.getTokenInfo(tokenAddress);
  }

  // ====================== Private Client Methods ======================

  async prepareTransaction(
    transaction: UnsignedCalldata,
    fromAddress: Address,
  ): Promise<UnsignedCalldataWithGas> {
    return this.privateClient.prepareTransaction(transaction, fromAddress);
  }

  async sendRawTransaction(
    signedTransaction: SignedTransaction,
  ): Promise<Hash> {
    return this.privateClient.sendRawTransaction(signedTransaction);
  }

  async sendTransactionAndWait(
    signedTransaction: SignedTransaction,
    options?: {
      timeout?: number;
      confirmations?: number;
    },
  ): Promise<TransactionReceipt> {
    return this.privateClient.sendTransactionAndWait(
      signedTransaction,
      options,
    );
  }

  async cancelTransaction(
    originalTxHash: Hash,
    gasPrice?: bigint,
  ): Promise<Hash> {
    return this.privateClient.cancelTransaction(originalTxHash, gasPrice);
  }

  async speedUpTransaction(
    originalTxHash: Hash,
    gasPrice?: bigint,
  ): Promise<Hash> {
    return this.privateClient.speedUpTransaction(originalTxHash, gasPrice);
  }

  // ====================== Chain Utility Methods ======================

  /**
   * Get list of supported chain IDs
   */
  getSupportedChains(): number[] {
    return this.chainService.getSupportedChains();
  }

  /**
   * Check if a chain ID is supported
   */
  isSupportedChain(chainId: SupportedChains): boolean {
    return this.chainService.isSupportedChain(chainId);
  }

  /**
   * Get chain name by ID
   */
  getChainName(chainId: SupportedChains): string {
    return this.chainService.getChainName(chainId);
  }

  /**
   * Get Viem chain object by ID
   */
  getViemChain(chainId: SupportedChains): Chain | undefined {
    return this.chainService.getViemChain(chainId);
  }

  /**
   * Get chain explorer URL by ID
   */
  getChainExplorer(chainId: SupportedChains): string | undefined {
    return this.chainService.getChainExplorer(chainId);
  }

  /**
   * Get chain native currency by ID
   */
  getChainCurrency(chainId: SupportedChains) {
    return this.chainService.getChainCurrency(chainId);
  }

  // ====================== Provider Utility Methods ======================

  /**
   * Get current provider information
   */
  getProviderInfo() {
    return {
      provider: this.currentProvider,
      publicClient: !!this.publicClient,
      privateClient: !!this.privateClient,
    };
  }

  /**
   * Health check for the current blockchain provider
   */
  async healthCheck(): Promise<{
    provider: string;
    healthy: boolean;
    latency: number;
    chainId: SupportedChains;
    blockNumber: bigint;
  }> {
    try {
      const startTime = Date.now();
      const [chainId, blockNumber] = await Promise.all([
        this.getCurrentChainId(),
        this.getBlockNumber(),
      ]);
      const latency = Date.now() - startTime;

      return {
        provider: this.currentProvider,
        healthy: true,
        latency,
        chainId,
        blockNumber,
      };
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return {
        provider: this.currentProvider,
        healthy: false,
        latency: -1,
        chainId: -1 as SupportedChains,
        blockNumber: BigInt(-1),
      };
    }
  }

  /**
   * Manually switch to the next provider (called when errors are detected externally)
   */
  async switchToNextProvider(): Promise<void> {
    if (typeof this.publicClient['switchProvider'] === 'function') {
      await this.publicClient['switchProvider']();
    } else {
      this.logger.warn('Current strategy does not support provider switching');
    }
  }
}
