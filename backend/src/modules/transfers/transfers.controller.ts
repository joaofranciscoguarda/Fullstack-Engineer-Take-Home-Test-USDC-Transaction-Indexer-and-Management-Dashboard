import { Controller, Get, Param, Query, Logger } from '@nestjs/common';
import { Public } from '@/common/decorators/public.decorator';
import { OptionalChainIdValidationPipe } from '@/common/pipes';
import { TransfersService } from './transfers.service';
import {
  GetTransfersQueryDto,
  GetTransfersByAddressQueryDto,
  GetBalanceParamsDto,
  GetBalanceQueryDto,
} from './dto/transfers.dto';
import { type SupportedChains } from '@/modules/blockchain';

@Public()
@Controller('api/transfers')
export class TransfersController {
  private readonly logger = new Logger(TransfersController.name);

  constructor(private readonly transfersService: TransfersService) {}

  /**
   * GET /api/transfers
   * Query indexed transfers with filtering options
   */
  @Get()
  async getTransfers(@Query() query: GetTransfersQueryDto) {
    this.logger.log('GET /api/transfers', query);
    return this.transfersService.getTransfers(query);
  }

  /**
   * GET /api/transfers/address/:address
   * Get transfer history for a specific address (both sent and received)
   */
  @Get('address/:address')
  async getTransfersByAddress(
    @Param('address') address: string,
    @Query() query: GetTransfersByAddressQueryDto,
  ) {
    this.logger.log(`GET /api/transfers/address/${address}`, query);
    return this.transfersService.getTransfersByAddress(address, query);
  }

  /**
   * GET /api/transfers/:txHash
   * Get specific transfer by transaction hash
   */
  @Get(':txHash')
  async getTransferByTxHash(
    @Param('txHash') txHash: string,
    @Query('chainId', OptionalChainIdValidationPipe) chainId?: SupportedChains,
  ) {
    this.logger.log(`GET /api/transfers/${txHash}`);
    const chain = chainId || 1; // Default to mainnet
    return this.transfersService.getTransferByTxHash(txHash, chain);
  }
}

@Public()
@Controller('api/balance')
export class BalanceController {
  private readonly logger = new Logger(BalanceController.name);

  constructor(private readonly transfersService: TransfersService) {}

  /**
   * GET /api/balance/:address
   * Calculate current USDC balance for an address using indexed data
   */
  @Get(':address')
  async getBalance(
    @Param() params: GetBalanceParamsDto,
    @Query() query: GetBalanceQueryDto,
  ) {
    this.logger.log(`GET /api/balance/${params.address}`, query);
    return this.transfersService.getBalance(
      params.address,
      query.chainId || 1,
      query.contractAddress,
    );
  }
}
