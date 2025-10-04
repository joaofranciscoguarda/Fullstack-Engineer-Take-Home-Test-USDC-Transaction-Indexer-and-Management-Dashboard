import { Test, TestingModule } from '@nestjs/testing';
import { ChainService } from '../chain.service';
import { SUPPORTED_VIEM_CHAINS, SupportedChains } from '../types/blockchain-config.types';
import { polygon, polygonAmoy, sepolia } from 'viem/chains';

describe('ChainService', () => {
    let service: ChainService;
    let module: TestingModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            providers: [ChainService],
        }).compile();

        service = module.get<ChainService>(ChainService);
    });

    afterEach(async () => {
        await module.close();
    });

    describe('getSupportedChains', () => {
        it('should return list of supported chain IDs', () => {
            const result = service.getSupportedChains();

            expect(result).toEqual([137, 80002, 11155111]); // Polygon, Polygon Amoy, Ethereum Sepolia
            expect(result).toHaveLength(3);
        });

        it('should return chain IDs in correct order', () => {
            const result = service.getSupportedChains();

            expect(result[0]).toBe(137); // Polygon
            expect(result[1]).toBe(80002); // Polygon Amoy
            expect(result[2]).toBe(11155111); // Ethereum Sepolia
        });
    });

    describe('isSupportedChain', () => {
        it('should return true for supported chains', () => {
            expect(service.isSupportedChain(137)).toBe(true); // Polygon
            expect(service.isSupportedChain(80002)).toBe(true); // Polygon Amoy
            expect(service.isSupportedChain(11155111)).toBe(true); // Ethereum Sepolia
        });

        it('should return false for unsupported chains', () => {
            expect(service.isSupportedChain(1)).toBe(false); // Ethereum Mainnet
            expect(service.isSupportedChain(56)).toBe(false); // BSC
            expect(service.isSupportedChain(999)).toBe(false); // Unknown chain
        });

        it('should handle edge cases', () => {
            expect(service.isSupportedChain(0)).toBe(false);
            expect(service.isSupportedChain(-1)).toBe(false);
            expect(service.isSupportedChain(Number.MAX_SAFE_INTEGER)).toBe(false);
        });
    });

    describe('getChainName', () => {
        it('should return correct chain names for supported chains', () => {
            expect(service.getChainName(137)).toBe('Polygon');
            expect(service.getChainName(80002)).toBe('Polygon Amoy');
            expect(service.getChainName(11155111)).toBe('Sepolia');
        });

        it('should return "Unknown Chain" for unsupported chains', () => {
            expect(service.getChainName(1)).toBe('Unknown Chain');
            expect(service.getChainName(56)).toBe('Unknown Chain');
            expect(service.getChainName(999)).toBe('Unknown Chain');
        });

        it('should handle edge cases', () => {
            expect(service.getChainName(0)).toBe('Unknown Chain');
            expect(service.getChainName(-1)).toBe('Unknown Chain');
        });
    });

    describe('getViemChain', () => {
        it('should return correct Viem chain objects for supported chains', () => {
            const polygonChain = service.getViemChain(137);
            const amoyChain = service.getViemChain(80002);
            const sepoliaChain = service.getViemChain(11155111);

            expect(polygonChain).toEqual(polygon);
            expect(amoyChain).toEqual(polygonAmoy);
            expect(sepoliaChain).toEqual(sepolia);
        });

        it('should return undefined for unsupported chains', () => {
            expect(service.getViemChain(1)).toBeUndefined();
            expect(service.getViemChain(56)).toBeUndefined();
            expect(service.getViemChain(999)).toBeUndefined();
        });

        it('should return chain objects with correct properties', () => {
            const polygonChain = service.getViemChain(137);

            expect(polygonChain).toHaveProperty('id', 137);
            expect(polygonChain).toHaveProperty('name', 'Polygon');
            expect(polygonChain).toHaveProperty('nativeCurrency');
            expect(polygonChain).toHaveProperty('rpcUrls');
            expect(polygonChain).toHaveProperty('blockExplorers');
        });
    });

    describe('getChainExplorer', () => {
        it('should return correct explorer URLs for supported chains', () => {
            const polygonExplorer = service.getChainExplorer(137);
            const amoyExplorer = service.getChainExplorer(80002);
            const sepoliaExplorer = service.getChainExplorer(11155111);

            expect(polygonExplorer).toBe('https://polygonscan.com');
            expect(amoyExplorer).toBe('https://amoy.polygonscan.com');
            expect(sepoliaExplorer).toBe('https://sepolia.etherscan.io');
        });

        it('should return undefined for unsupported chains', () => {
            expect(service.getChainExplorer(1)).toBeUndefined();
            expect(service.getChainExplorer(56)).toBeUndefined();
            expect(service.getChainExplorer(999)).toBeUndefined();
        });

        it('should return valid URLs', () => {
            const polygonExplorer = service.getChainExplorer(137);
            const amoyExplorer = service.getChainExplorer(80002);
            const sepoliaExplorer = service.getChainExplorer(11155111);

            expect(polygonExplorer).toMatch(/^https:\/\//);
            expect(amoyExplorer).toMatch(/^https:\/\//);
            expect(sepoliaExplorer).toMatch(/^https:\/\//);
        });
    });

    describe('getChainCurrency', () => {
        it('should return correct currency objects for supported chains', () => {
            const polygonCurrency = service.getChainCurrency(137);
            const amoyCurrency = service.getChainCurrency(80002);
            const sepoliaCurrency = service.getChainCurrency(11155111);

            expect(polygonCurrency).toEqual({
                name: 'POL',
                symbol: 'POL',
                decimals: 18,
            });

            expect(amoyCurrency).toEqual({
                name: 'POL',
                symbol: 'POL',
                decimals: 18,
            });

            expect(sepoliaCurrency).toEqual({
                name: 'Sepolia Ether',
                symbol: 'ETH',
                decimals: 18,
            });
        });

        it('should return undefined for unsupported chains', () => {
            expect(service.getChainCurrency(1)).toBeUndefined();
            expect(service.getChainCurrency(56)).toBeUndefined();
            expect(service.getChainCurrency(999)).toBeUndefined();
        });

        it('should return currency objects with correct structure', () => {
            const polygonCurrency = service.getChainCurrency(137);

            expect(polygonCurrency).toHaveProperty('name');
            expect(polygonCurrency).toHaveProperty('symbol');
            expect(polygonCurrency).toHaveProperty('decimals');
            expect(typeof polygonCurrency?.name).toBe('string');
            expect(typeof polygonCurrency?.symbol).toBe('string');
            expect(typeof polygonCurrency?.decimals).toBe('number');
        });
    });

    describe('integration tests', () => {
        it('should provide consistent data across all methods', () => {
            const supportedChains = service.getSupportedChains();

            supportedChains.forEach((chainId) => {
                // All supported chains should have names
                const chainName = service.getChainName(chainId);
                expect(chainName).not.toBe('Unknown Chain');

                // All supported chains should be marked as supported
                expect(service.isSupportedChain(chainId)).toBe(true);

                // All supported chains should have Viem chain objects
                const viemChain = service.getViemChain(chainId);
                expect(viemChain).toBeDefined();
                expect(viemChain?.id).toBe(chainId);

                // All supported chains should have explorer URLs
                const explorer = service.getChainExplorer(chainId);
                expect(explorer).toBeDefined();
                expect(explorer).toMatch(/^https:\/\//);

                // All supported chains should have currency info
                const currency = service.getChainCurrency(chainId);
                expect(currency).toBeDefined();
                expect(currency?.name).toBeDefined();
                expect(currency?.symbol).toBeDefined();
                expect(currency?.decimals).toBe(18);
            });
        });

        it('should handle all supported chain types correctly', () => {
            const testCases: Array<{
                chainId: SupportedChains;
                expectedName: string;
                expectedSymbol: string;
            }> = [
                { chainId: 137, expectedName: 'Polygon', expectedSymbol: 'POL' },
                { chainId: 80002, expectedName: 'Polygon Amoy', expectedSymbol: 'POL' },
                { chainId: 11155111, expectedName: 'Sepolia', expectedSymbol: 'ETH' },
            ];

            testCases.forEach(({ chainId, expectedName, expectedSymbol }) => {
                expect(service.getChainName(chainId)).toBe(expectedName);
                expect(service.getChainCurrency(chainId)?.symbol).toBe(expectedSymbol);
                expect(service.isSupportedChain(chainId)).toBe(true);
                expect(service.getViemChain(chainId)).toBeDefined();
                expect(service.getChainExplorer(chainId)).toBeDefined();
            });
        });
    });

    describe('performance tests', () => {
        it('should handle multiple calls efficiently', () => {
            const startTime = Date.now();

            // Make many calls to test performance
            for (let i = 0; i < 1000; i++) {
                service.getSupportedChains();
                service.isSupportedChain(137);
                service.getChainName(137);
                service.getViemChain(137);
                service.getChainExplorer(137);
                service.getChainCurrency(137);
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should complete within reasonable time (adjust threshold as needed)
            expect(duration).toBeLessThan(1000); // 1 second
        });

        it('should handle concurrent calls', async () => {
            const promises = Array.from({ length: 100 }, () =>
                Promise.all([
                    service.getSupportedChains(),
                    service.isSupportedChain(137),
                    service.getChainName(137),
                    service.getViemChain(137),
                    service.getChainExplorer(137),
                    service.getChainCurrency(137),
                ]),
            );

            const results = await Promise.all(promises);

            // All results should be consistent
            results.forEach((result) => {
                expect(result[0]).toEqual([137, 80002, 11155111]); // getSupportedChains
                expect(result[1]).toBe(true); // isSupportedChain
                expect(result[2]).toBe('Polygon'); // getChainName
                expect(result[3]).toBeDefined(); // getViemChain
                expect(result[4]).toBeDefined(); // getChainExplorer
                expect(result[5]).toBeDefined(); // getChainCurrency
            });
        });
    });

    describe('error handling', () => {
        it('should handle invalid input gracefully', () => {
            // Test with various invalid inputs
            expect(() => service.isSupportedChain(NaN)).not.toThrow();
            expect(() => service.getChainName(NaN)).not.toThrow();
            expect(() => service.getViemChain(NaN)).not.toThrow();
            expect(() => service.getChainExplorer(NaN)).not.toThrow();
            expect(() => service.getChainCurrency(NaN)).not.toThrow();
        });

        it('should handle null and undefined inputs', () => {
            expect(() => service.isSupportedChain(null as any)).not.toThrow();
            expect(() => service.getChainName(null as any)).not.toThrow();
            expect(() => service.getViemChain(null as any)).not.toThrow();
            expect(() => service.getChainExplorer(null as any)).not.toThrow();
            expect(() => service.getChainCurrency(null as any)).not.toThrow();
        });
    });
});
