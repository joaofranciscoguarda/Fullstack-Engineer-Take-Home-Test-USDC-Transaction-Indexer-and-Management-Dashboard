import { SupportedChains } from '@/modules/blockchain/types/blockchain-config.types';
import { Address, Hash } from 'viem';

// Tipo emitido pela action
export type UnsignedCalldata = {
  to: Address;
  data: Hash;
  value: bigint;
  type: 'eip1559' | 'legacy' | 'eip2930';
};

// Tipo populado pelo executor com informações de gás
export type UnsignedCalldataWithGas = UnsignedCalldata & {
  // Para transações do tipo 0x2 (EIP-1559) o gasPrice é substituído por maxFeePerGas e maxPriorityFeePerGas
  from: Address;
  gas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas?: bigint;
  chainId: SupportedChains;
};

// Tipo populado pelo wallet com informações de assinatura
export type SignedTransaction = UnsignedCalldataWithGas & {
  signature: Hash;
  nonce: bigint;
};
