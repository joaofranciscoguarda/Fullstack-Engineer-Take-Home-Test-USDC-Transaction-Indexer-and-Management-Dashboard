import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  TransfersRepository,
  ContractsRepository,
} from '@/database/prisma/repositories';
import {
  GetTransfersQueryDto,
  GetTransfersByAddressQueryDto,
} from './dto/transfers.dto';
import { Prisma } from '@prisma/client';
import { SupportedChains } from '@/modules/blockchain';
import { formatUnits } from 'viem';

@Injectable()
export class TransfersService {
  private readonly logger = new Logger(TransfersService.name);

  constructor(
    private readonly transfersRepo: TransfersRepository,
    private readonly contractsRepo: ContractsRepository,
  ) {}

  /**
   * Get transfers with filtering
   */
  async getTransfers(query: GetTransfersQueryDto) {
    const {
      page = 1,
      limit = 50,
      address,
      fromAddress,
      toAddress,
      contractAddress,
      chainId,
      fromBlock,
      toBlock,
      startDate,
      endDate,
      minAmount,
      maxAmount,
    } = query;

    const skip = (page - 1) * limit;
    const where: Prisma.TransfersWhereInput = {};

    // Address filters
    if (address) {
      where.OR = [
        { from_address: address.toLowerCase() },
        { to_address: address.toLowerCase() },
      ];
    }
    if (fromAddress) {
      where.from_address = fromAddress.toLowerCase();
    }
    if (toAddress) {
      where.to_address = toAddress.toLowerCase();
    }
    if (contractAddress) {
      where.contract_address = contractAddress.toLowerCase();
    }

    // Chain filter
    if (chainId) {
      where.chain_id = chainId;
    }

    // Block range filter
    if (fromBlock || toBlock) {
      where.block_number = {};
      if (fromBlock) {
        where.block_number.gte = BigInt(fromBlock);
      }
      if (toBlock) {
        where.block_number.lte = BigInt(toBlock);
      }
    }

    // Date range filter
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate);
      }
    }

    // Amount range filter
    // Note: Comparing string amounts is tricky, better to convert to BigInt
    // For now, we'll skip this in the query and filter in memory if needed

    return await this.transfersRepo.findTransfers({
      skip,
      take: limit,
      where,
      orderBy: { timestamp: 'desc' },
    });
  }

  /**
   * Get transfers for a specific address
   */
  async getTransfersByAddress(
    address: string,
    query: GetTransfersByAddressQueryDto,
  ) {
    const { page = 1, limit = 50, chainId, startDate, endDate, type } = query;

    const skip = (page - 1) * limit;
    const where: Prisma.TransfersWhereInput = {};

    // Type filter (sent/received)
    if (type === 'sent') {
      where.from_address = address.toLowerCase();
    } else if (type === 'received') {
      where.to_address = address.toLowerCase();
    } else {
      // Both
      where.OR = [
        { from_address: address.toLowerCase() },
        { to_address: address.toLowerCase() },
      ];
    }

    // Chain filter
    if (chainId) {
      where.chain_id = chainId;
    }

    // Date range
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate);
      }
    }

    const result = await this.transfersRepo.findTransfers({
      skip,
      take: limit,
      where,
      orderBy: { timestamp: 'desc' },
    });

    return result;
  }

  /**
   * Get transfer by transaction hash
   */
  async getTransferByTxHash(txHash: string, chainId: SupportedChains) {
    const transfer = await this.transfersRepo.getTransferByTxHash(
      txHash,
      chainId,
    );

    if (!transfer) {
      throw new NotFoundException(
        `Transfer not found for tx hash ${txHash} on chain ${chainId}`,
      );
    }

    return transfer;
  }

  /**
   * Calculate balance for an address
   */
  async getBalance(
    address: string,
    chainId: SupportedChains = 1,
    contractAddress?: string,
  ) {
    // If no contract address provided, get default USDC for the chain
    let contract = contractAddress;
    if (!contract) {
      const contracts =
        await this.contractsRepo.getActiveContractsByChain(chainId);
      const usdcContract = contracts.find(
        (c) => c.symbol.toUpperCase() === 'USDC',
      );

      if (!usdcContract) {
        throw new NotFoundException(
          `No USDC contract found for chain ${chainId}`,
        );
      }

      contract = usdcContract.address;
    }
    const balance = await this.transfersRepo.calculateBalance(
      address.toLowerCase(),
      chainId,
      contract.toLowerCase(),
    );

    // Get contract info for decimals
    const contractInfo = await this.contractsRepo.getContractByAddressAndChain(
      contract,
      chainId,
    );

    return {
      address,
      chainId,
      contractAddress: contract,
      balance: balance.toString(),
      decimals: contractInfo?.decimals || 6, // USDC typically has 6 decimals
      formatted: this.formatBalance(balance, contractInfo?.decimals || 6),
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get balance history for an address (optimized for charting)
   */
  async getBalanceHistory(
    address: string,
    chainId: SupportedChains = 1,
    contractAddress?: string,
    limit: number = 1000,
  ) {
    // If no contract address provided, get default USDC for the chain
    let contract = contractAddress;
    if (!contract) {
      const contracts =
        await this.contractsRepo.getActiveContractsByChain(chainId);
      const usdcContract = contracts.find(
        (c) => c.symbol.toUpperCase() === 'USDC',
      );

      if (!usdcContract) {
        throw new NotFoundException(
          `No USDC contract found for chain ${chainId}`,
        );
      }

      contract = usdcContract.address;
    }

    // Get contract info for decimals
    const contractInfo = await this.contractsRepo.getContractByAddressAndChain(
      contract,
      chainId,
    );
    const decimals = contractInfo?.decimals || 6;

    // Get up to 'limit' most recent transfers for this address
    const where: Prisma.TransfersWhereInput = {
      chain_id: chainId,
      contract_address: contract.toLowerCase(),
      OR: [
        { from_address: address.toLowerCase() },
        { to_address: address.toLowerCase() },
      ],
    };

    const transfers = await this.transfersRepo.findMany({
      where,
      orderBy: { timestamp: 'asc' }, // Oldest first for balance calculation
      take: limit,
    });

    // Calculate balance at each point
    const history: Array<{
      timestamp: Date;
      block_number: bigint;
      balance: bigint;
      balance_formatted: string;
      tx_hash: string;
      direction: 'incoming' | 'outgoing';
      amount: bigint;
    }> = [];

    let currentBalance = BigInt(0);

    for (const transfer of transfers) {
      const isIncoming =
        transfer.to_address.toLowerCase() === address.toLowerCase();

      // Update balance
      if (isIncoming) {
        currentBalance += transfer.amount;
      } else {
        currentBalance -= transfer.amount;
      }

      history.push({
        timestamp: transfer.timestamp,
        block_number: transfer.block_number,
        balance: currentBalance,
        balance_formatted: this.formatBalance(currentBalance, decimals),
        tx_hash: transfer.tx_hash,
        direction: isIncoming ? 'incoming' : 'outgoing',
        amount: transfer.amount,
      });
    }

    return {
      address,
      current_balance: currentBalance,
      current_balance_formatted: this.formatBalance(currentBalance, decimals),
      chain_id: chainId,
      contract_address: contract,
      data_points: history.length,
      history,
    };
  }

  /**
   * Format balance with decimals
   */
  private formatBalance(balance: bigint, decimals: number): string {
    return formatUnits(balance, decimals);
  }
}
