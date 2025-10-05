import { BaseModel, IBaseModel } from './base.model';
import { Prisma } from '@prisma/client';
import { ToDatabase, ToResponse } from '@/common/types';
import { TransferResponse } from '@/common/response/transfer.response';
import { SupportedChains } from '@/modules/blockchain';
import { Log } from 'viem';

export class Transfer
  extends BaseModel<Transfer, ITransfer, 'Transfers', 'string'>
  implements ITransfer
{
  declare id: string;
  declare tx_hash: string;
  declare log_index: number;
  declare block_number: bigint;
  declare block_hash: string;
  declare timestamp: Date;
  declare from_address: string;
  declare to_address: string;
  declare amount: bigint;
  declare contract_id: string;
  declare contract_address: string;
  declare chain_id: SupportedChains;
  declare gas_price?: bigint | null;
  declare gas_used?: bigint | null;
  declare status: number;
  declare is_confirmed: boolean;
  declare confirmations: number;
  declare updated_at?: Date;

  /**
   * Define default response class for Transfer
   */
  static defaultResponseClass() {
    return TransferResponse;
  }

  static getUniqueConstraintFields() {
    return ['tx_hash', 'log_index', 'chain_id'] as const;
  }

  static getUniqueConstraintName() {
    return 'unique_transfer';
  }

  /**
   * Parse logs into Transfer instances
   * @param logs Array of event logs from blockchain
   * @param chainId The chain ID where the logs were fetched
   * @param contractAddress The contract address
   * @param contractId The contract ID from database
   * @param blockData Optional map of block data for timestamps
   * @returns Array of Transfer instances
   */
  static fromLogs(
    logs: Log[],
    chainId: SupportedChains,
    contractAddress: string,
    contractId: string,
    blockData?: Map<bigint, any>,
  ): Transfer[] {
    const transfers: Transfer[] = [];

    for (const log of logs) {
      try {
        if (
          !log.blockNumber ||
          !log.logIndex ||
          !log.topics ||
          log.topics.length < 3 ||
          !log.data
        ) {
          continue;
        }

        // Extract addresses from indexed topics (topics[1] = from, topics[2] = to)
        const fromAddress = `0x${log.topics[1]!.slice(26)}`;
        const toAddress = `0x${log.topics[2]!.slice(26)}`;

        // Extract value from data field (non-indexed parameter)
        const value = BigInt(`0x${log.data.slice(2)}`);

        // Get timestamp from block data if available, otherwise use current time
        let timestamp = new Date();
        if (blockData && log.blockNumber) {
          const block = blockData.get(log.blockNumber);
          if (block && block.timestamp) {
            timestamp = new Date(Number(block.timestamp) * 1000);
          }
        }

        transfers.push(
          new Transfer({
            tx_hash: log.transactionHash as string,
            log_index: log.logIndex,
            block_number: log.blockNumber,
            block_hash: log.blockHash as string,
            timestamp,
            from_address: fromAddress.toLowerCase(),
            to_address: toAddress.toLowerCase(),
            amount: value,
            contract_id: contractId,
            contract_address: contractAddress.toLowerCase(),
            chain_id: chainId,
            status: 1,
            is_confirmed: false,
            confirmations: 0,
          }),
        );
      } catch (error) {
        // Log error but continue processing other logs
        console.error(
          `Error processing log (block ${log.blockNumber}, tx ${log.transactionHash})`,
          error,
        );
      }
    }

    return transfers;
  }
}

// Keep track of whats in the database
Prisma.TransfersScalarFieldEnum;

export interface ITransfer extends IBaseModel<'string'> {
  id: string;
  tx_hash: string;
  log_index: number;
  block_number: bigint;
  block_hash: string;
  timestamp: Date;
  from_address: string;
  to_address: string;
  amount: bigint;
  contract_id: string;
  contract_address: string;
  chain_id: SupportedChains;
  gas_price?: bigint | null;
  gas_used?: bigint | null;
  status: number;
  is_confirmed: boolean;
  confirmations: number;
  updated_at?: Date | null;
}

export type ITransferDatabase = ToDatabase<ITransfer>;
export type ITransferResponse = ToResponse<ITransfer>;
