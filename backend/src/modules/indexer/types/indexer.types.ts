import { SupportedChains } from '@/modules/blockchain';

export interface IndexerConfig {
  chainId: SupportedChains;
  contractAddress: string;
  startBlock: bigint;
  blockRange: bigint; // How many blocks to process per job
  pollingInterval: number; // ms between checking for new blocks
  confirmationsRequired: number; // Number of confirmations before marking as confirmed
  catchUpChunkSize: bigint; // Size of chunks for rapid catch-up
}

export interface ProcessedBlock {
  blockNumber: bigint;
  transfersCount: number;
  timestamp: Date;
}

export enum IndexerStatus {
  STOPPED = 'stopped',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  CATCHING_UP = 'catching_up',
}

export interface IndexerStatusInfo {
  chainId: SupportedChains;
  contractAddress: string;
  status: IndexerStatus;
  lastProcessedBlock: bigint;
  currentBlock: bigint;
  lag: bigint; // currentBlock - lastProcessedBlock
  blocksPerSecond: number;
  transfersIndexed: bigint;
  errorCount: number;
  lastError?: string;
  lastErrorAt?: Date;
  isCatchingUp: boolean;
}
