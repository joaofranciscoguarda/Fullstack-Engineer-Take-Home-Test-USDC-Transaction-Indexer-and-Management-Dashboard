import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ChainService } from '../chain.service';
import { BlockchainConfigFactory } from '../config/blockchain-config.factory';
import { BlockchainTestUtils } from './test-utils';
import { vi } from 'vitest';

/**
 * Test setup utilities for blockchain module tests
 */
export class BlockchainTestSetup {
    /**
     * Create a complete testing module with all blockchain dependencies
     */
    static async createTestingModule(
        overrides: {
            configService?: Partial<any>;
            chainService?: Partial<any>;
            blockchainConfigFactory?: Partial<any>;
        } = {},
    ): Promise<TestingModule> {
        const configService = {
            ...BlockchainTestUtils.createMockConfigService(),
            ...overrides.configService,
        };

        const chainService = {
            ...BlockchainTestUtils.createMockChainService(),
            ...overrides.chainService,
        };

        const blockchainConfigFactory = {
            createStrategy: vi.fn(),
            validateConfig: vi.fn(),
            getAvailableProviders: vi.fn().mockReturnValue(['viem', 'ethers', 'web3', 'mock']),
            isProviderImplemented: vi.fn().mockReturnValue(true),
            ...overrides.blockchainConfigFactory,
        };

        return Test.createTestingModule({
            providers: [
                { provide: ConfigService, useValue: configService },
                { provide: ChainService, useValue: chainService },
                { provide: BlockchainConfigFactory, useValue: blockchainConfigFactory },
            ],
        }).compile();
    }

    /**
     * Create a minimal testing module for unit tests
     */
    static async createMinimalTestingModule(providers: any[]): Promise<TestingModule> {
        return Test.createTestingModule({
            providers,
        }).compile();
    }

    /**
     * Setup common test environment variables
     */
    static setupTestEnvironment(): void {
        process.env.DEFAULT_CHAIN_ID = '137';
        process.env.BLOCKCHAIN_PROVIDER = 'viem';
        process.env.BLOCKCHAIN_TIMEOUT = '30000';
        process.env.BLOCKCHAIN_RETRY_ATTEMPTS = '3';
        process.env.VIEM_TRANSPORT_TIMEOUT = '10000';
        process.env.VIEM_POLLING_INTERVAL = '1000';
    }

    /**
     * Clean up test environment
     */
    static cleanupTestEnvironment(): void {
        delete process.env.DEFAULT_CHAIN_ID;
        delete process.env.BLOCKCHAIN_PROVIDER;
        delete process.env.BLOCKCHAIN_TIMEOUT;
        delete process.env.BLOCKCHAIN_RETRY_ATTEMPTS;
        delete process.env.VIEM_TRANSPORT_TIMEOUT;
        delete process.env.VIEM_POLLING_INTERVAL;
    }

    /**
     * Create mock blockchain configuration for testing
     */
    static createMockBlockchainConfig() {
        return {
            defaultChainId: 137,
            defaultProvider: 'viem',
            timeout: 30000,
            retryAttempts: 3,
            confirmations: 2,
            chains: {
                137: {
                    name: 'Polygon',
                    providers: [
                        {
                            name: 'alchemy',
                            transport: 'https://polygon-mainnet.g.alchemy.com/v2/test-key',
                            timeout: 30000,
                            retryAttempts: 3,
                            blockRange: { from: 0, to: 'latest' },
                        },
                    ],
                },
            },
        };
    }

    /**
     * Create mock error responses for testing error handling
     */
    static createMockErrorResponses() {
        return {
            networkError: new Error('Network error: connection timeout'),
            rateLimitError: (() => {
                const error = new Error('Rate limit exceeded');
                (error as any).status = 429;
                return error;
            })(),
            serverError: (() => {
                const error = new Error('Internal server error');
                (error as any).status = 500;
                return error;
            })(),
            clientError: (() => {
                const error = new Error('Bad request');
                (error as any).status = 400;
                return error;
            })(),
            rpcError: new Error('RPC error: method not found'),
            timeoutError: new Error('Request timeout'),
        };
    }

    /**
     * Create mock transaction data for testing
     */
    static createMockTransactionData() {
        return {
            to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as const,
            data: '0x1234567890abcdef',
            value: BigInt(1000000000000000000),
            type: 'eip1559' as const,
        };
    }

    /**
     * Create mock signed transaction for testing
     */
    static createMockSignedTransaction() {
        return {
            to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as const,
            data: '0x1234567890abcdef',
            value: BigInt(1000000000000000000),
            gas: BigInt(21000),
            maxFeePerGas: BigInt(30000000000),
            maxPriorityFeePerGas: BigInt(2000000000),
            nonce: 42,
            chainId: 137,
            signature:
                '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12',
        };
    }

    /**
     * Create mock addresses for testing
     */
    static createMockAddresses() {
        return {
            user: '0x1234567890123456789012345678901234567890' as const,
            contract: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as const,
            token: '0x9876543210987654321098765432109876543210' as const,
        };
    }

    /**
     * Wait for a specified amount of time (useful for testing async operations)
     */
    static async wait(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Create a promise that rejects after a specified timeout
     */
    static createTimeoutPromise(ms: number): Promise<never> {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), ms);
        });
    }

    /**
     * Create a promise that resolves after a specified delay
     */
    static createDelayedPromise<T>(value: T, delay: number): Promise<T> {
        return new Promise((resolve) => {
            setTimeout(() => resolve(value), delay);
        });
    }
}
