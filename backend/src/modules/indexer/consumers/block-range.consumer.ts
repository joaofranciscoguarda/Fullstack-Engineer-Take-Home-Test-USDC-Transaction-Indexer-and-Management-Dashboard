import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BlockRangeJobData } from '@/modules/queue/queue.service';
import {
  TransfersRepository,
  ContractsRepository,
  IndexerStateRepository,
} from '@/database/prisma/repositories';
import { BlockchainService, SupportedChains } from '@/modules/blockchain';
import { Prisma } from '@prisma/client';

/**
 * Block Range Consumer - Worker Service
 *
 * Processes block range jobs from the queue
 * Fetches Transfer events and stores them in the database
 */
@Processor('block-ranges', {
  concurrency: 5, // Process 5 jobs concurrently
})
export class BlockRangeConsumer extends WorkerHost {
  private readonly logger = new Logger(BlockRangeConsumer.name);

  constructor(
    private readonly transfersRepo: TransfersRepository,
    private readonly contractsRepo: ContractsRepository,
    private readonly indexerStateRepo: IndexerStateRepository,
    private readonly blockchainService: BlockchainService,
  ) {
    super();
  }

  async process(
    job: Job<BlockRangeJobData>,
  ): Promise<{ transfersProcessed: number }> {
    const { chainId, contractAddress, fromBlock, toBlock } = job.data;

    // Convert string back to bigint
    const from = typeof fromBlock === 'string' ? BigInt(fromBlock) : fromBlock;
    const to = typeof toBlock === 'string' ? BigInt(toBlock) : toBlock;

    this.logger.debug(
      `Processing blocks ${from} to ${to} for chain ${chainId}, contract ${contractAddress}`,
    );

    try {
      // Fetch Transfer events from blockchain
      const transfers = await this.fetchTransferEvents(
        chainId,
        contractAddress,
        from,
        to,
      );

      this.logger.log(
        `Found ${transfers.length} transfers in blocks ${from} to ${to}`,
      );

      // Store transfers in database (idempotent)
      if (transfers.length > 0) {
        await this.transfersRepo.upsertFromRawData(transfers);
      }

      // Update indexer state
      await this.indexerStateRepo.updateLastProcessedBlock(
        chainId,
        contractAddress,
        to,
        transfers.length,
      );

      // Update job progress
      await job.updateProgress(100);

      return { transfersProcessed: transfers.length };
    } catch (error) {
      this.logger.error(
        `Error processing blocks ${from} to ${to} for chain ${chainId}`,
        error.stack,
      );

      // Record error in indexer state
      await this.indexerStateRepo.recordError(
        chainId,
        contractAddress,
        error.message,
      );

      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Fetch Transfer events from blockchain
   */
  private async fetchTransferEvents(
    chainId: SupportedChains,
    contractAddress: string,
    fromBlock: bigint,
    toBlock: bigint,
  ): Promise<Prisma.TransfersCreateInput[]> {
    // Get contract info from database
    const contract = await this.contractsRepo.getContractByAddressAndChain(
      contractAddress,
      chainId,
    );

    if (!contract) {
      throw new Error(
        `Contract ${contractAddress} not found for chain ${chainId}`,
      );
    }

    // Fetch logs from blockchain using the blockchain service
    const logs = await this.blockchainService.getLogs({
      address: contractAddress as `0x${string}`,
      fromBlock,
      toBlock,
      eventType: {
        type: 'event',
        inputs: [],
        name: 'Transfer',
      },
    });

    // Transform logs into database format
    const transfers: Prisma.TransfersCreateInput[] = [];

    for (const log of logs) {
      try {
        // Get block timestamp
        const block = await this.blockchainService.getBlock(log.blockNumber);

        const transfer: Prisma.TransfersCreateInput = {
          tx_hash: log.transactionHash as string,
          log_index: log.logIndex,
          block_number: log.blockNumber,
          block_hash: log.blockHash as string,
          timestamp: new Date(Number(block.timestamp) * 1000),
          from_address: log.args.from.toLowerCase(),
          to_address: log.args.to.toLowerCase(),
          amount: log.args.value.toString(),
          contract: {
            connect: { id: contract.id },
          },
          contract_address: contractAddress.toLowerCase(),
          chain_id: chainId,
          status: 1, // Success
          is_confirmed: false, // Will be updated later after confirmations
          confirmations: 0,
        };

        transfers.push(transfer);
      } catch (error) {
        this.logger.error(
          `Error processing log at block ${log.blockNumber}, tx ${log.transactionHash}`,
          error,
        );
        // Continue processing other logs
      }
    }

    return transfers;
  }

  /**
   * Handle job failure
   */
  async onFailed(job: Job<BlockRangeJobData>, error: Error): Promise<void> {
    this.logger.error(
      `Job ${job.id} failed after ${job.attemptsMade} attempts`,
      error.stack,
    );
  }

  /**
   * Handle job completion
   */
  async onCompleted(job: Job<BlockRangeJobData>, result: any): Promise<void> {
    this.logger.log(
      `Job ${job.id} completed: processed ${result.transfersProcessed} transfers`,
    );
  }
}
