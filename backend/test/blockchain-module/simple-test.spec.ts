import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ChainService } from '../chain.service';

describe('ChainService - Simple Test', () => {
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
    });
});
