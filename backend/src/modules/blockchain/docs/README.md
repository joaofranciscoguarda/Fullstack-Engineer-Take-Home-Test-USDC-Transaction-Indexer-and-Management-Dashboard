# Blockchain Module - Laravel Inspired Architecture

This document explains the Laravel-inspired blockchain module that provides a unified interface for different blockchain libraries (Viem, Ethers, Web3.js) with strategy pattern and provider switching capabilities.

## 🎯 **Architecture Overview**

```
┌─────────────────────────────────────────────────────────────────┐
│                       Blockchain Module                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │ BlockchainService│    │ Abstract        │    │ Strategies   │ │
│  │   (Facade)      │────│ Strategy        │    │ (Viem/Ethers)│ │
│  └─────────────────┘    │ (Laravel-style) │    └──────────────┘ │
│                         └─────────────────┘                     │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Provider Management                            │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │ │
│  │  │   Viem      │  │   Ethers    │  │       Web3.js       │  │ │
│  │  │  Strategy   │  │  Strategy   │  │      Strategy       │  │ │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🏗️ **Key Components**

### **1. BlockchainService** (Laravel's Facade)

The main service that acts as a unified interface for all blockchain operations:

```typescript
@Injectable()
export class BlockchainService implements BlockchainPublicClient, BlockchainPrivateClient {
    // Unified interface for read operations
    async getBalance(address: Address): Promise<bigint>;
    async getTransaction(hash: Hash): Promise<any>;
    async waitForTransactionReceipt(hash: Hash): Promise<TransactionReceipt>;

    // Unified interface for write operations
    async sendRawTransaction(signedTx: SignedTransaction): Promise<Hash>;
    async prepareTransaction(tx: UnsignedCalldata, from: Address): Promise<UnsignedCalldataWithGas>;

    // Provider management
    async changeStrategy(provider: 'viem' | 'ethers' | 'web3'): Promise<void>;
    async healthCheck(): Promise<HealthStatus>;
}
```

### **2. Abstract Strategy** (Laravel's Driver Pattern)

```typescript
export abstract class AbstractBlockchainStrategy {
    // Strategy interface
    abstract initialize(chainId?: SupportedChains): Promise<void>;
    abstract switchChain(chainId: SupportedChains): Promise<void>;
    abstract getCurrentChain(): Promise<Chain>;

    // Error handling and retry logic
    isRetryableError(error: Error): boolean;
    shouldChangeProvider(error: Error): boolean;
    getRetryDelay(error: Error, attempt: number): number;

    // Provider health
    abstract isProviderHealthy(): Promise<boolean>;
    abstract getProviderLatency(): Promise<number>;
}
```

### **3. Concrete Strategies** (Driver Implementations)

#### **Viem Strategy** (Current Implementation)

```typescript
@Injectable()
export class ViemBlockchainStrategy extends AbstractBlockchainStrategy {
    // Public client operations
    async getBlockNumber(): Promise<bigint>;
    async getBalance(address: Address): Promise<bigint>;
    async call(transaction: UnsignedCalldata): Promise<Hash>;

    // Private client operations
    async sendRawTransaction(signedTx: SignedTransaction): Promise<Hash>;
    async prepareTransaction(tx: UnsignedCalldata, from: Address): Promise<UnsignedCalldataWithGas>;

    // Provider switching (your shouldChangeClient logic)
    async switchProvider(): Promise<void>;
}
```

## 📁 **File Structure**

```
src/modules/blockchain/
├── blockchain.module.ts            # Dynamic module loader
├── blockchain.service.ts           # Main facade service
├──
├── strategies/                     # Blockchain drivers
│   ├── blockchain-strategy.interface.ts    # Strategy interfaces
│   ├── abstract-blockchain.strategy.ts     # Base strategy class
│   ├── viem.strategy.ts           # Viem implementation (current)
│   ├── ethers.strategy.ts         # Ethers implementation (future)
│   └── web3.strategy.ts           # Web3.js implementation (future)
│
├── config/                        # Configuration
│   ├── blockchain-config.factory.ts       # Strategy factory
│   └── viem_transport.config.ts          # Viem transport config (moved)
│
├── types/                         # Type definitions
│   ├── module-interop.types.ts    # Transaction types (moved)
│   ├── blockchain-config.types.ts # Chain definitions (moved)
│
└── index.ts                      # Public exports
```

## 🔧 **Configuration** (Laravel: config/blockchain.php)

### **Environment Variables**

```bash
# Blockchain Provider Selection
BLOCKCHAIN_PROVIDER=viem          # viem | ethers | web3 | mock

# Default Chain Configuration
DEFAULT_CHAIN_ID=137              # Polygon Mainnet

# Provider Timeouts
BLOCKCHAIN_TIMEOUT=30000          # 30 seconds
BLOCKCHAIN_RETRY_ATTEMPTS=3       # Max retry attempts

# Viem-specific Configuration
VIEM_TRANSPORT_TIMEOUT=10000      # 10 seconds
VIEM_POLLING_INTERVAL=1000        # 1 second

# Transaction Defaults
TIMEOUT_WAIT_FOR_TX_SECONDS=300   # 5 minutes
```

### **Dynamic Module Configuration**

```typescript
// In your app.module.ts
@Module({
    imports: [
        BlockchainModule.forRoot(), // Global blockchain access
        // or
        BlockchainModule.forFeature(), // Feature-specific access
    ],
})
export class AppModule {}
```

## 🚀 **Usage Examples**

### **Basic Blockchain Operations**

```typescript
@Injectable()
export class MyService {
    constructor(private readonly blockchainService: BlockchainService) {}

    async getUserBalance(userAddress: Address): Promise<string> {
        const balance = await this.blockchainService.getBalance(userAddress);
        return formatEther(balance);
    }

    async sendTransaction(signedTx: SignedTransaction): Promise<string> {
        const hash = await this.blockchainService.sendRawTransaction(signedTx);

        // Wait for confirmation
        const receipt = await this.blockchainService.waitForTransactionReceipt(hash, {
            timeout: 300000, // 5 minutes
            confirmations: 2,
        });

        return hash;
    }
}
```

### **Queue Integration** (Your Enhanced Executor)

```typescript
// In ExecutorQueueProcessor
async processBlockchainTransaction(jobData: any): Promise<any> {
  const { payload } = jobData;

  if (payload.signedTransaction) {
    // Send pre-signed transaction
    const hash = await this.blockchainService.sendRawTransaction(payload.signedTransaction);
    const receipt = await this.blockchainService.waitForTransactionReceipt(hash);

    return {
      status: 'completed',
      transactionHash: hash,
      blockNumber: Number(receipt.blockNumber),
      gasUsed: Number(receipt.gasUsed),
    };
  }

  if (payload.transactionData) {
    // Prepare transaction for external signing
    const prepared = await this.blockchainService.prepareTransaction(
      payload.transactionData,
      payload.fromAddress
    );

    // Send to external signing service
    throw new Error('External signing not implemented');
  }
}
```

### **Contract Interactions**

```typescript
// Read-only contract call
async getTokenBalance(tokenAddress: Address, userAddress: Address): Promise<bigint> {
  return this.blockchainService.getTokenBalance(tokenAddress, userAddress);
}

// Contract execution via transaction
async executeContract(contractAddress: Address, data: Hash, signedTx: SignedTransaction): Promise<any> {
  const hash = await this.blockchainService.sendRawTransaction(signedTx);
  return this.blockchainService.waitForTransactionReceipt(hash);
}
```

### **Provider Switching** (Your shouldChangeClient Logic)

```typescript
// Health monitoring
async monitorProviderHealth(): Promise<void> {
  const health = await this.blockchainService.healthCheck();

  if (!health.healthy) {
    this.logger.warn(`Provider ${health.provider} is unhealthy, latency: ${health.latency}ms`);

    // The strategy will automatically switch providers on retryable errors
    // Or manually trigger a provider switch:
    // await this.blockchainService.changeStrategy('ethers');
  }
}

// Error handling with automatic provider switching
try {
  const balance = await this.blockchainService.getBalance(address);
} catch (error) {
  // AbstractBlockchainStrategy will automatically:
  // 1. Check if error is retryable
  // 2. Switch provider if needed (your shouldChangeClient logic)
  // 3. Retry with exponential backoff
  // 4. Eventually throw if all providers fail
}
```

## 🔄 **Provider Switching Flow** (Enhanced from Your Archive)

Your archived `shouldChangeClient` logic is now enhanced and integrated:

```typescript
// In AbstractBlockchainStrategy
shouldChangeProvider(error: Error): boolean {
  const status = this.parseError(error).status || this.parseError(error).code;

  // Rate limiting (HTTP 429)
  if (status === 429) return true;

  // Client/Server errors (4xx/5xx)
  if (status >= 400 && status < 600) return true;

  // Blockchain-specific errors
  const patterns = [
    /rate limit/i,
    /quota exceeded/i,
    /service unavailable/i,
    /rpc.*unavailable/i,
  ];

  return patterns.some(pattern => pattern.test(error.message));
}

// Automatic retry with provider switching
async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (this.shouldChangeProvider(error)) {
        await this.switchProvider(); // Your provider switching logic
      }

      if (attempt === maxRetries || !this.isRetryableError(error)) {
        throw error;
      }

      const delay = this.getRetryDelay(error, attempt);
      await this.sleep(delay);
    }
  }
}
```

## 🛡️ **Error Handling & Retry Strategy**

```typescript
// Blockchain-specific retryable errors
isRetryableError(error: Error): boolean {
  const patterns = [
    // Your existing patterns
    /rate limit/i,
    /network/i,
    /timeout/i,

    // Enhanced blockchain patterns
    /nonce too low/i,
    /gas price too low/i,
    /block not found/i,
    /pending transaction/i,
    /node.*sync/i,
    /rpc.*error/i,
  ];

  return patterns.some(pattern => pattern.test(error.message));
}

// Progressive retry delays
getRetryDelay(error: Error, attemptNumber: number): number {
  if (/rate limit/i.test(error.message)) {
    return Math.min(1000 * Math.pow(3, attemptNumber), 30000); // 3x backoff for rate limits
  }

  return Math.min(1000 * Math.pow(2, attemptNumber - 1), 30000); // 2x backoff for others
}
```

## 🎯 **Migration from Your Archive**

Your existing code maps perfectly to this new architecture:

| **New Architecture**                       |
| ------------------------------------------ |
| `ViemBlockchainStrategy`                   |
| `shouldChangeProvider()`                   |
| `switchProvider()`                         |
| `executeWithRetry()` (enhanced)            |
| Moved to `config/viem_transport.config.ts` |
| Enhanced in `AbstractBlockchainStrategy`   |

## 🔮 **Future Extensions**

1. **Additional Strategies**: Ethers, Web3.js, Alchemy SDK
2. **Key Management**: Integration with external signing services
3. **Contract ABIs**: Automatic contract interaction with type safety
4. **Event Monitoring**: Real-time blockchain event streaming
5. **Transaction Pool**: Batch transaction processing
6. **Gas Optimization**: Automatic gas price optimization

This architecture provides the same provider switching and error handling capabilities as your archived code, but with Laravel's clean architecture patterns and easy extensibility! 🚀
