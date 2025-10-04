import { Injectable } from '@nestjs/common';
import { Chain } from 'viem';
import { polygon, polygonAmoy, sepolia } from 'viem/chains';
import { SupportedChains, SUPPORTED_VIEM_CHAINS } from './types';

@Injectable()
export class ChainService {
  /**
   * Get list of supported chain IDs
   */
  getSupportedChains(): number[] {
    return SUPPORTED_VIEM_CHAINS.map((chain) => chain.id);
  }

  /**
   * Check if a chain ID is supported
   */
  isSupportedChain(chainId: SupportedChains): boolean {
    return this.getSupportedChains().includes(chainId);
  }

  /**
   * Get chain name by ID
   */
  getChainName(chainId: SupportedChains): string {
    const chain = SUPPORTED_VIEM_CHAINS.find((c) => c.id === chainId);
    return chain?.name || 'Unknown Chain';
  }

  /**
   * Get Viem chain object by ID
   */
  getViemChain(chainId: SupportedChains): Chain | undefined {
    return SUPPORTED_VIEM_CHAINS.find((c) => c.id === chainId);
  }

  /**
   * Get chain explorer URL by ID
   */
  getChainExplorer(chainId: SupportedChains): string | undefined {
    const chain = SUPPORTED_VIEM_CHAINS.find((c) => c.id === chainId);
    return chain?.blockExplorers?.default?.url;
  }

  /**
   * Get chain native currency by ID
   */
  getChainCurrency(chainId: SupportedChains) {
    const chain = SUPPORTED_VIEM_CHAINS.find((c) => c.id === chainId);
    return chain?.nativeCurrency;
  }
}
