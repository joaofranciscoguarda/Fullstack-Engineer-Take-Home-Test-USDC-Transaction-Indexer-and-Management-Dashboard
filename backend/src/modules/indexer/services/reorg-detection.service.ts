import { Injectable, Logger } from '@nestjs/common';
import {
  IndexerStateRepository,
  ContractsRepository,
  ReorgsRepository,
  TransfersRepository,
} from '@/database/prisma/repositories';
import { Reorg } from '@/common/models';
import { BlockchainService, SupportedChains } from '@/modules/blockchain';
import { ConfigService } from '@nestjs/config';

/** Handles blockchain reorganization detection and recovery */
@Injectable()
export class ReorgDetectionService {
  private readonly logger = new Logger(ReorgDetectionService.name);

  constructor(
    private readonly reorgsRepo: ReorgsRepository,
    private readonly transfersRepo: TransfersRepository,
    private readonly indexerStateRepo: IndexerStateRepository,
    private readonly contractsRepo: ContractsRepository,
    private readonly blockchainService: BlockchainService,
    private readonly configService: ConfigService,
  ) {}

  async checkForReorg(
    chainId: SupportedChains,
    blockNumberToCheck: bigint,
  ): Promise<void> {
    if (blockNumberToCheck < 1n) return;

    this.blockchainService.switchChain(chainId);
    const currentBlock = await this.blockchainService.getBlockNumber();
    const reorgCheckDepth = BigInt(
      this.configService.get<number>('REORG_CHECK_DEPTH', 10),
    );

    // Skip reorg check for very old blocks
    if (currentBlock - blockNumberToCheck > reorgCheckDepth) return;

    try {
      // Get current block hash from blockchain
      const block = await this.blockchainService.getBlock(blockNumberToCheck);
      const currentBlockHash = block.hash;

      if (!currentBlockHash) return;

      // Get stored block hash from our database
      const storedBlockHash = await this.transfersRepo.getStoredBlockHash(
        chainId,
        blockNumberToCheck,
      );

      // If we don't have any stored hash yet, nothing to compare
      if (!storedBlockHash) return;

      // Compare hashes - if they differ, we have a reorg!
      if (currentBlockHash.toLowerCase() !== storedBlockHash.toLowerCase()) {
        this.logger.warn(
          `⚠ Reorg detected at block ${blockNumberToCheck} on chain ${chainId}`,
        );
        this.logger.warn(
          `  Stored hash: ${storedBlockHash.substring(0, 10)}...`,
        );
        this.logger.warn(
          `  Current hash: ${currentBlockHash.substring(0, 10)}...`,
        );

        await this.handleReorg(
          chainId,
          blockNumberToCheck,
          storedBlockHash,
          currentBlockHash,
        );
      }
    } catch (error) {
      // If block doesn't exist yet or other errors, just log and continue
      this.logger.debug(
        `Could not check reorg for block ${blockNumberToCheck}: ${error.message}`,
      );
    }
  }

  private async handleReorg(
    chainId: SupportedChains,
    reorgBlock: bigint,
    oldBlockHash: string,
    newBlockHash: string,
  ): Promise<void> {
    // Check if we already detected this reorg recently
    const existingReorg = await this.reorgsRepo.getReorgAtBlock(
      chainId,
      reorgBlock,
    );

    if (existingReorg) {
      this.logger.debug(`Reorg already detected and recorded`);
      return;
    }

    // Find the depth of the reorg by checking previous blocks
    let reorgDepth = 1;
    let checkBlock = reorgBlock - 1n;
    const maxDepthToCheck = 100;

    while (reorgDepth < maxDepthToCheck && checkBlock > 0n) {
      const storedHash = await this.transfersRepo.getStoredBlockHash(
        chainId,
        checkBlock,
      );

      if (!storedHash) break;

      try {
        const block = await this.blockchainService.getBlock(checkBlock);
        if (
          block.hash &&
          block.hash.toLowerCase() === storedHash.toLowerCase()
        ) {
          // Found matching block - reorg ends here
          break;
        }
        reorgDepth++;
        checkBlock--;
      } catch (error) {
        break;
      }
    }

    const rollbackToBlock = reorgBlock - BigInt(reorgDepth);

    this.logger.warn(
      `Reorg detected: depth=${reorgDepth}, rolling back to block ${rollbackToBlock}`,
    );

    // Count affected transfers before deletion
    const affectedCount = await this.transfersRepo.countTransfersInRange(
      chainId,
      rollbackToBlock + 1n,
      reorgBlock + BigInt(10), // Delete a bit more to be safe
    );

    // Create reorg record
    const reorg = new Reorg({
      chain_id: chainId,
      detected_at_block: reorgBlock,
      reorg_depth: reorgDepth,
      old_block_hash: oldBlockHash,
      new_block_hash: newBlockHash,
      status: 'detected',
      transfers_affected: affectedCount,
      detected_at: new Date(),
    });

    await this.reorgsRepo.createReorg(reorg);

    // Delete affected transfers
    const deletedCount = await this.transfersRepo.deleteTransfersInRange(
      chainId,
      rollbackToBlock + 1n,
      reorgBlock + BigInt(10),
    );

    this.logger.warn(
      `✓ Rolled back ${deletedCount} transfers from blocks ${rollbackToBlock + 1n} to ${reorgBlock + BigInt(10)}`,
    );

    // Reset indexer state to rollback point
    const contract = await this.contractsRepo.getAllActiveContracts();
    const relevantContract = contract.find((c) => c.chains.includes(chainId));

    if (relevantContract) {
      await this.indexerStateRepo.updateLastProcessedBlock(
        chainId,
        relevantContract.address,
        rollbackToBlock,
        0,
      );

      this.logger.warn(
        `✓ Reset indexer to block ${rollbackToBlock}. Will re-index from there.`,
      );
    }

    // Mark reorg as resolved
    if (reorg.id) {
      await this.reorgsRepo.markReorgResolved(reorg.id, deletedCount);
    }
  }
}
