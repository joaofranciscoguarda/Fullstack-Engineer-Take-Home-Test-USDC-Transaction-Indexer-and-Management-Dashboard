import { Injectable } from '@nestjs/common';
import {
  Hash,
  Address,
  TransactionReceipt,
  Chain,
  PublicClient,
  WalletClient,
  createClient,
  createWalletClient,
  http,
  BlockNotFoundError,
  WaitForTransactionReceiptReturnType,
  createPublicClient,
  AbiEvent,
} from 'viem';
import { ConfigService } from '@nestjs/config';
import { SupportedChains } from '../types';
import {
  UnsignedCalldata,
  UnsignedCalldataWithGas,
  SignedTransaction,
} from '../types/module-interop.types';
import { ChainService } from '../chain.service';
import {
  BlockchainProviderConfig,
  ChainConfig,
  SUPPORTED_VIEM_CHAINS,
} from '../types/blockchain-config.types';
import { AbstractBlockchainStrategy } from './abstract-blockchain.strategy';
import {
  BlockchainPublicClient,
  BlockchainPrivateClient,
} from './blockchain-strategy.interface';

/**
 * Viem blockchain strategy implementation
 * Supports both public (read-only) and private (write) operations
 */
@Injectable() // , BlockchainPrivateClient
export class ViemBlockchainStrategy
  extends AbstractBlockchainStrategy
  implements BlockchainPublicClient
{
  private publicClient: PublicClient;
  private walletClient?: WalletClient;
  private chainConfig: ChainConfig;
  private currentProviderIndex = 0;
  private currentProvider: BlockchainProviderConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly chainService: ChainService,
  ) {
    super();
  }

  async initialize(chainId?: SupportedChains): Promise<void> {
    const targetChainId = chainId || this.getDefaultChainId();
    this.validateChainId(targetChainId);

    this.currentChainId = targetChainId;
    this.chainConfig = this.getChainConfig(targetChainId);

    if (
      !this.chainConfig.providers ||
      this.chainConfig.providers.length === 0
    ) {
      throw new Error(
        `No providers configured for chain ${this.currentChainId}`,
      );
    }

    this.currentProviderIndex = 0;
    this.currentProvider = this.chainConfig.providers[0];

    await this.createClients();
    this.isInitialized = true;

    this.logger.log(
      `Viem strategy initialized for chain ${this.currentChainId} (${this.chainConfig.name}) with provider ${this.currentProvider.name}`,
    );
  }

  async switchChain(chainId: SupportedChains): Promise<void> {
    if (this.currentChainId === chainId) {
      this.logger.debug(`Already on chain ${chainId}`);
      return;
    }

    try {
      this.validateChainId(chainId);
    } catch {
      this.logger.error(`Unsupported chain ID: ${chainId}`);

      // Fallback to default chain
      this.logger.warn(`Fallback to default chain ${this.defaultChainId}`);
      chainId = this.defaultChainId;
    }

    this.currentChainId = chainId;
    this.chainConfig = this.getChainConfig(chainId);
    this.currentProviderIndex = 0;
    this.currentProvider = this.chainConfig.providers[0];

    await this.createClients();
    await this.onChainSwitch(chainId);

    this.logger.log(`Switched to chain ${chainId} (${this.chainConfig.name})`);
  }

  async getCurrentChain(): Promise<Chain> {
    if (!this.publicClient) {
      throw new Error('Viem strategy not initialized');
    }
    return this.publicClient.chain!;
  }

  async getCurrentChainId(): Promise<SupportedChains> {
    if (!this.publicClient) {
      throw new Error('Viem strategy not initialized');
    }
    return this.publicClient.chain!.id as SupportedChains;
  }

  async switchProvider(): Promise<void> {
    if (this.chainConfig.providers.length <= 1) {
      throw new Error('No alternative providers available');
    }

    const oldProvider = this.currentProvider;
    this.currentProviderIndex =
      (this.currentProviderIndex + 1) % this.chainConfig.providers.length;
    this.currentProvider =
      this.chainConfig.providers[this.currentProviderIndex];

    this.logger.warn(
      `Switching from ${oldProvider.name} to ${this.currentProvider.name}`,
    );

    await this.createClients();
    await this.onProviderSwitch();

    this.logger.log(`Provider switched to ${this.currentProvider.name}`);
  }

  isChainSupported(chainId: SupportedChains): boolean {
    return SUPPORTED_VIEM_CHAINS.some((chain) => chain.id === chainId);
  }

  // ====================== Public Client Methods ======================

  async getBlockNumber(): Promise<bigint> {
    return this.executeWithRetry(
      () => this.publicClient.getBlockNumber(),
      3,
      'getBlockNumber',
    );
  }

  async getBlock(blockIdentifier: bigint | Hash): Promise<any> {
    return this.executeWithRetry(
      () => {
        if (typeof blockIdentifier === 'bigint') {
          return this.publicClient.getBlock({ blockNumber: blockIdentifier });
        } else {
          return this.publicClient.getBlock({ blockHash: blockIdentifier });
        }
      },
      3,
      'getBlock',
    );
  }

  async getTransaction(hash: Hash): Promise<any> {
    return this.executeWithRetry(
      () => this.publicClient.getTransaction({ hash }),
      3,
      'getTransaction',
    );
  }

  async getTransactionReceipt(hash: Hash): Promise<TransactionReceipt> {
    return this.executeWithRetry(
      () => this.publicClient.getTransactionReceipt({ hash }),
      3,
      'getTransactionReceipt',
    );
  }

  async waitForTransactionReceipt(
    hash: Hash,
    options: {
      timeout?: number;
      confirmations?: number;
      pollingInterval?: number;
    } = {},
  ): Promise<TransactionReceipt> {
    const {
      timeout = (Number(process.env.TIMEOUT_WAIT_FOR_TX_SECONDS) || 300) * 1000,
      confirmations = 2,
      pollingInterval = 1000,
    } = options;

    let attempt = 1;
    const maxAttempts = 3;

    return this.executeWithRetry(
      async () => {
        let receipt: WaitForTransactionReceiptReturnType | undefined;

        do {
          try {
            receipt = await this.publicClient.waitForTransactionReceipt({
              hash,
              timeout,
              confirmations,
              pollingInterval,
            });
          } catch (error) {
            if (error instanceof BlockNotFoundError) {
              this.logger.debug(
                `Transaction ${hash} not mined yet, retrying... (attempt ${attempt})`,
              );
              await this.sleep(2 ** attempt * 500);
            } else {
              throw error;
            }
          }
        } while (attempt++ < maxAttempts && !receipt);

        if (!receipt) {
          throw new Error(
            `Transaction ${hash} not found after ${maxAttempts} attempts`,
          );
        }

        if (receipt.status === 'reverted') {
          this.logger.error(`Transaction ${hash} reverted!`, {
            logs: receipt.logs,
          });
          throw new Error(`Transaction ${hash} reverted`);
        }

        this.logger.debug(
          `Transaction ${hash} mined with status: ${receipt.status}`,
        );
        return receipt;
      },
      2,
      'waitForTransactionReceipt',
    );
  }

  async getBalance(address: Address, blockNumber?: bigint): Promise<bigint> {
    return this.executeWithRetry(
      () => this.publicClient.getBalance({ address, blockNumber }),
      3,
      'getBalance',
    );
  }

  async getTransactionCount(
    address: Address,
    blockNumber?: bigint,
  ): Promise<number> {
    return this.executeWithRetry(
      () => this.publicClient.getTransactionCount({ address, blockNumber }),
      3,
      'getTransactionCount',
    );
  }

  async estimateGas(transaction: UnsignedCalldata): Promise<bigint> {
    return this.executeWithRetry(
      () => this.publicClient.estimateGas(transaction),
      3,
      'estimateGas',
    );
  }

  async getGasPrice(): Promise<bigint> {
    return this.executeWithRetry(
      () => this.publicClient.getGasPrice(),
      3,
      'getGasPrice',
    );
  }

  async estimateFeesPerGas(): Promise<{
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
  }> {
    return this.executeWithRetry(
      () => this.publicClient.estimateFeesPerGas(),
      3,
      'estimateFeesPerGas',
    );
  }

  async call(
    transaction: UnsignedCalldata,
    blockNumber?: bigint,
  ): Promise<Hash> {
    const result = await this.executeWithRetry(
      () =>
        this.publicClient.call({
          to: transaction.to,
          data: transaction.data,
          value: transaction.value,
          blockNumber,
        }),
      3,
      'call',
    );
    return result as unknown as Hash;
  }

  async getLogs(options: {
    address?: Address | Address[];
    topics?: Hash[][];
    fromBlock?: bigint;
    toBlock?: bigint;
    eventType?: AbiEvent;
  }): Promise<any[]> {
    // Build the getLogs parameters
    const getLogsParams: any = {};
    
    if (options.address) getLogsParams.address = options.address;
    if (options.fromBlock !== undefined) getLogsParams.fromBlock = options.fromBlock;
    if (options.toBlock !== undefined) getLogsParams.toBlock = options.toBlock;
    
    // Handle event type and topics
    if (options.eventType) {
      getLogsParams.event = options.eventType;
    } else if (options.topics) {
      getLogsParams.topics = options.topics;
    }

    return this.executeWithRetry(
      () => this.publicClient.getLogs(getLogsParams),
      3,
      'getLogs',
    );
  }

  async getTokenBalance(
    tokenAddress: Address,
    accountAddress: Address,
  ): Promise<bigint> {
    // ERC-20 balanceOf function call
    const data =
      `0x70a08231${accountAddress.slice(2).padStart(64, '0')}` as Hash;

    const result = await this.call({
      to: tokenAddress,
      data,
      value: 0n,
      type: 'eip1559',
    });

    return BigInt(result);
  }

  async getTokenInfo(tokenAddress: Address): Promise<{
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: bigint;
  }> {
    // This would require multiple contract calls for name, symbol, decimals, totalSupply
    // Implementation depends on specific ERC-20 contract calls
    throw new Error(
      'getTokenInfo not implemented - requires contract ABI integration',
    );
  }

  // ====================== Private Client Methods ======================

  async prepareTransaction(
    transaction: UnsignedCalldata,
    fromAddress: Address,
  ): Promise<UnsignedCalldataWithGas> {
    const [gas, fees, nonce] = await Promise.all([
      this.estimateGas(transaction),
      this.estimateFeesPerGas(),
      this.getTransactionCount(fromAddress),
    ]);

    return {
      ...transaction,
      from: fromAddress,
      gas,
      maxFeePerGas: fees.maxFeePerGas,
      maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      chainId: this.currentChainId,
    };
  }

  async sendRawTransaction(
    signedTransaction: SignedTransaction,
  ): Promise<Hash> {
    if (!signedTransaction.signature) {
      throw new Error('Transaction must be signed');
    }

    return this.executeWithRetry(
      () =>
        this.publicClient.sendRawTransaction({
          serializedTransaction: signedTransaction.signature,
        }),
      2,
      'sendRawTransaction',
    );
  }

  //   async sendTransactionAndWait(
  //     signedTransaction: SignedTransaction,
  //     options: {
  //       timeout?: number;
  //       confirmations?: number;
  //     } = {},
  //   ): Promise<TransactionReceipt> {
  //     const hash = await this.sendRawTransaction(signedTransaction);
  //     return this.waitForTransactionReceipt(hash, options);
  //   }

  async cancelTransaction(
    originalTxHash: Hash,
    gasPrice?: bigint,
  ): Promise<Hash> {
    // Implementation would require getting the original transaction and creating a cancellation
    throw new Error(
      'cancelTransaction not implemented - requires wallet integration',
    );
  }

  async speedUpTransaction(
    originalTxHash: Hash,
    gasPrice?: bigint,
  ): Promise<Hash> {
    // Implementation would require getting the original transaction and increasing gas price
    throw new Error(
      'speedUpTransaction not implemented - requires wallet integration',
    );
  }

  // ====================== Provider Health Methods ======================

  async isProviderHealthy(): Promise<boolean> {
    try {
      const startTime = Date.now();
      await this.getBlockNumber();
      const latency = Date.now() - startTime;

      // Consider healthy if response time is under 5 seconds
      return latency < 5000;
    } catch {
      return false;
    }
  }

  async getProviderLatency(): Promise<number> {
    const startTime = Date.now();
    try {
      await this.getBlockNumber();
      return Date.now() - startTime;
    } catch {
      return -1; // Error state
    }
  }

  getProviderName(): string {
    return this.currentProvider.name;
  }

  getAvailableProviders(): string[] {
    return this.chainConfig.providers.map((provider) => provider.name);
  }

  // ====================== Private Methods ======================

  private async createClients(): Promise<void> {
    const chain = this.chainService.getViemChain(this.currentChainId);
    if (!chain) {
      throw new Error(`Unsupported chain: ${this.currentChainId}`);
    }
    const transport = http(this.currentProvider.transport);

    this.publicClient = createPublicClient({
      chain,
      transport,
    });

    this.logger.debug(
      `Created Viem public client for chain ${this.currentChainId} (${this.chainConfig.name}) with provider ${this.currentProvider.name}`,
    );
  }

  /**
   * Create a wallet client for signing transactions
   * This would typically be called when a private key is available
   */
  createWalletClient(account: Address): any {
    const chain = this.chainService.getViemChain(this.currentChainId);
    if (!chain) {
      throw new Error(`Unsupported chain: ${this.currentChainId}`);
    }
    const transport = http(this.currentProvider.transport);

    return createWalletClient({
      chain,
      transport,
      account,
    });
  }

  // ====================== Utility Methods ======================

  getCurrentProviderConfig() {
    return {
      name: this.currentProvider.name,
      blockRange: this.currentProvider.blockRange,
      index: this.currentProviderIndex,
      totalProviders: this.chainConfig.providers.length,
      timeout: this.currentProvider.timeout,
      retryAttempts: this.currentProvider.retryAttempts,
    };
  }

  // ====================== Config Helper Methods ======================

  private getDefaultChainId(): SupportedChains {
    const chainId = this.configService.get<number>(
      'blockchain.defaultChainId',
      11155111, // Default to Sepolia testnet
    );
    // Ensure it's a number, not a string
    return Number(chainId) as SupportedChains;
  }

  private getChainConfig(chainId: SupportedChains): ChainConfig {
    const chains = this.configService.get<Record<number, ChainConfig>>(
      'blockchain.chains',
      {},
    );
    const chainConfig = chains[chainId];

    if (!chainConfig) {
      throw new Error(`No configuration found for chain ID: ${chainId}`);
    }

    return chainConfig;
  }

  /**
   * Get blockchain global configuration
   */
  getBlockchainConfig() {
    return {
      defaultChainId: this.configService.get<number>(
        'blockchain.defaultChainId',
      ),
      defaultProvider: this.configService.get<string>(
        'blockchain.defaultProvider',
      ),
      timeout: this.configService.get<number>('blockchain.timeout'),
      retryAttempts: this.configService.get<number>('blockchain.retryAttempts'),
      confirmations: this.configService.get<number>('blockchain.confirmations'),
    };
  }

  /**
   * Get current chain configuration
   */
  getCurrentChainConfig(): ChainConfig {
    return this.chainConfig;
  }
}
