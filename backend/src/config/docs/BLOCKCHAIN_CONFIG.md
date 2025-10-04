# Blockchain Configuration

This document explains the new **blockchain configuration system** that replaces scattered `process.env` calls with a centralized, organized config structure.

## 🎯 **Problem Solved**

**Before (Anti-pattern):**

```typescript
// Scattered throughout code
const transport = process.env.POLYGON_INFURA_TRANSPORT!;
const chainId = process.env.DEFAULT_CHAIN_ID || 137;
// Hard to manage, no validation, poor organization
```

**After (Laravel-style):**

```typescript
// Centralized config in src/config/blockchain.config.ts
const chainConfig = this.configService.get('blockchain.chains.137');
const transport = chainConfig.providers[0].transport;
// Clean, validated, organized
```

## 🏗️ **Configuration Structure**

### **File: `src/config/blockchain.config.ts`**

```typescript
export default registerAs(
    'blockchain',
    (): BlockchainConfig => ({
        // Global settings
        defaultChainId: 137,
        defaultProvider: 'viem',
        timeout: 30000,

        // Chain-specific configurations
        chains: {
            [polygon.id]: {
                chainId: polygon.id,
                name: 'Polygon',
                providers: [
                    {
                        name: 'Infura Polygon',
                        transport: getEnvVar('POLYGON_INFURA_TRANSPORT'),
                        blockRange: 10_000_000n,
                        timeout: 15000,
                    },
                    // Multiple providers for automatic failover
                ],
            },
        },
    }),
);
```

## 📁 **Environment Variables Organization**

### **Before (Bloated .env):**

```bash
DEFAULT_RPC_TRANSPORT=https://sepolia.infura.io/v3/...
SEPOLIA_INFURA_TRANSPORT=https://sepolia.infura.io/v3/...
SEPOLIA_ALCHEMY_TRANSPORT=https://eth-sepolia.g.alchemy.com/v2/...
SEPOLIA_ANKR_TRANSPORT=https://rpc.ankr.com/eth_sepolia
POLYGON_INFURA_TRANSPORT=https://polygon-mainnet.infura.io/v3/...
POLYGON_ALCHEMY_TRANSPORT=https://polygon-mainnet.g.alchemy.com/v2/...
# ... scattered and hard to manage
```

### **After (organized):**

```bash
# =================================================================
# BLOCKCHAIN CONFIGURATION
# =================================================================

# Global Blockchain Settings
DEFAULT_CHAIN_ID=137
DEFAULT_BLOCKCHAIN_PROVIDER=viem
BLOCKCHAIN_TIMEOUT=30000
BLOCKCHAIN_RETRY_ATTEMPTS=3

# =================================================================
# POLYGON MAINNET RPC PROVIDERS
# =================================================================
POLYGON_INFURA_TRANSPORT=https://polygon-mainnet.infura.io/v3/YOUR_KEY
POLYGON_ALCHEMY_TRANSPORT=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY

# =================================================================
# ETHEREUM SEPOLIA TESTNET RPC PROVIDERS
# =================================================================
SEPOLIA_INFURA_TRANSPORT=https://sepolia.infura.io/v3/YOUR_KEY
SEPOLIA_ALCHEMY_TRANSPORT=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

## 🔧 **Usage in Code**

### **In Strategies:**

```typescript
@Injectable()
export class ViemBlockchainStrategy extends AbstractBlockchainStrategy {
    constructor(private readonly configService: ConfigService) {
        super();
    }

    private getChainConfig(chainId: SupportedChains): ChainConfig {
        const chains = this.configService.get<Record<number, ChainConfig>>('blockchain.chains');
        return chains[chainId];
    }

    private getDefaultChainId(): SupportedChains {
        return this.configService.get<number>('blockchain.defaultChainId', 137);
    }
}
```

### **In Services:**

```typescript
@Injectable()
export class BlockchainService {
    constructor(private readonly configService: ConfigService) {}

    async healthCheck() {
        const config = this.configService.get('blockchain');
        const timeout = config.timeout;
        const retryAttempts = config.retryAttempts;
        // Clean access to configuration
    }
}
```

## 🎛️ **Configuration Structure**

### **Global Configuration:**

```typescript
interface BlockchainConfig {
    defaultChainId: number; // Default chain to use
    defaultProvider: string; // Default provider type
    timeout: number; // Global timeout (ms)
    retryAttempts: number; // Max retry attempts
    confirmations: number; // Default confirmations
    chains: Record<SupportedChains, ChainConfig>; // Chain-specific configs
}
```

### **Chain Configuration:**

```typescript
interface ChainConfig {
    chainId: number; // Chain ID
    name: string; // Human-readable name
    providers: BlockchainProviderConfig[]; // Multiple providers
    defaultProvider?: string; // Preferred provider
    explorerUrl?: string; // Block explorer
    nativeCurrency: {
        // Native currency info
        name: string;
        symbol: string;
        decimals: number;
    };
}
```

### **Provider Configuration:**

```typescript
interface BlockchainProviderConfig {
    name: string; // Provider name
    transport: string; // RPC URL
    blockRange: bigint; // Max block range for queries
    timeout?: number; // Provider-specific timeout
    retryAttempts?: number; // Provider-specific retries
}
```

## 🚀 **Benefits**

### **1. Laravel-style Organization**

- **Centralized Configuration**: All blockchain config in one place
- **Environment Separation**: Easy to override per environment
- **Validation**: Type-safe configuration with validation
- **Nested Access**: Clean dot notation (`blockchain.chains.137.providers`)

### **2. Provider Management**

- **Multiple Providers**: Automatic failover between RPC providers
- **Provider-specific Settings**: Custom timeouts and retry logic
- **Health Monitoring**: Built-in provider health checking
- **Easy Addition**: Add new providers without code changes

### **3. Chain Management**

- **Multi-chain Support**: Easy configuration for multiple networks
- **Chain Metadata**: Native currency info, explorer URLs
- **Type Safety**: Full TypeScript support
- **Validation**: Ensures required providers are configured

### **4. Developer Experience**

- **Clean Code**: No more scattered `process.env` calls
- **IDE Support**: Full autocomplete and type checking
- **Documentation**: Self-documenting configuration structure
- **Testing**: Easy to mock and test configurations

## 📝 **Migration Guide**

### **Step 1: Update Environment Variables**

Replace your old scattered RPC variables with the new organized structure (see `env-blockchain-example.txt`).

### **Step 2: Update Code**

Replace direct `process.env` access:

```typescript
// Before
const transport = process.env.POLYGON_INFURA_TRANSPORT!;

// After
const chainConfig = this.configService.get('blockchain.chains.137');
const transport = chainConfig.providers[0].transport;
```

### **Step 3: Use ConfigService**

Inject `ConfigService` in your constructors:

```typescript
constructor(private readonly configService: ConfigService) {}
```

### **Step 4: Access Configuration**

Use the clean dot notation:

```typescript
// Global settings
const defaultChain = this.configService.get('blockchain.defaultChainId');

// Chain-specific settings
const polygonConfig = this.configService.get('blockchain.chains.137');

// Provider settings
const providers = polygonConfig.providers;
```

## 🌟 **Laravel Comparison**

| **Laravel**                            | **Our Implementation**                           |
| -------------------------------------- | ------------------------------------------------ |
| `config/database.php`                  | `src/config/blockchain.config.ts`                |
| `config('database.default')`           | `configService.get('blockchain.defaultChainId')` |
| `config('database.connections.mysql')` | `configService.get('blockchain.chains.137')`     |
| Environment validation                 | Built-in with `getEnvVar()` helper               |
| Config caching                         | NestJS built-in caching                          |

This Laravel-inspired configuration system provides clean, maintainable, and scalable blockchain configuration management! 🎉
