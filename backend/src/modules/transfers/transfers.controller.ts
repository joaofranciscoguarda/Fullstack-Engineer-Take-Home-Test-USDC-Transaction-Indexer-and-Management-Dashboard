import {
  Controller,
  Get,
  Param,
  Query,
  Logger,
  UseInterceptors,
} from '@nestjs/common';
import { Public, Cacheable } from '@/common/decorators';
import { CacheInterceptor } from '@/common/interceptors';
import { OptionalChainIdValidationPipe } from '@/common/pipes';
import { TransfersService } from './transfers.service';
import {
  GetTransfersQueryDto,
  GetTransfersByAddressQueryDto,
  GetBalanceParamsDto,
  GetBalanceQueryDto,
} from './dto/transfers.dto';
import { type SupportedChains } from '@/modules/blockchain';
import {
  TransferResponse,
  TransferResponseList,
} from '@/common/response/transfer.response';
import { BalanceResponse } from '@/common/response/balance.response';

@Public()
@Controller('api/transfers')
@UseInterceptors(CacheInterceptor)
export class TransfersController {
  private readonly logger = new Logger(TransfersController.name);

  constructor(private readonly transfersService: TransfersService) {}

  /**
   * GET /api/transfers
   * Query indexed transfers with filtering options
   */
  @Get()
  @Cacheable(120, 'get-transfers') // Cache for 5 minutes
  async getTransfers(@Query() query: GetTransfersQueryDto) {
    this.logger.log('GET /api/transfers', query);
    const result = await this.transfersService.getTransfers(query);

    return new TransferResponseList(result.data, result.pagination);
  }

  /**
   * GET /api/transfers/address/:address
   * Get transfer history for a specific address (both sent and received)
   */
  @Get('address/:address')
  @Cacheable(180, 'get-transfers-by-address') // Cache for 3 minutes
  async getTransfersByAddress(
    @Param('address') address: string,
    @Query() query: GetTransfersByAddressQueryDto,
  ) {
    this.logger.log(`GET /api/transfers/address/${address}`, query);
    const result = await this.transfersService.getTransfersByAddress(
      address,
      query,
    );

    return new TransferResponseList(result.data, result.pagination);
  }

  /**
   * GET /api/transfers/:txHash
   * Get specific transfer by transaction hash
   */
  @Get(':txHash')
  @Cacheable(600, 'get-transfer-by-txhash') // Cache for 10 minutes (transactions are immutable)
  async getTransferByTxHash(
    @Param('txHash') txHash: string,
    @Query('chainId', OptionalChainIdValidationPipe) chainId?: SupportedChains,
  ) {
    this.logger.log(`GET /api/transfers/${txHash}`);
    const chain = chainId || 1; // Default to mainnet
    const result = await this.transfersService.getTransferByTxHash(
      txHash,
      chain,
    );

    return new TransferResponse(result);
  }
}

@Public()
@Controller('api/balance')
@UseInterceptors(CacheInterceptor)
export class BalanceController {
  private readonly logger = new Logger(BalanceController.name);

  constructor(private readonly transfersService: TransfersService) {}

  /**
   * GET /api/balance/:address
   * Calculate current USDC balance for an address using indexed data
   */
  @Get(':address')
  @Cacheable(60, 'get-balance') // Cache for 1 minute (balance can change frequently)
  async getBalance(
    @Param() params: GetBalanceParamsDto,
    @Query() query: GetBalanceQueryDto,
  ) {
    this.logger.log(`GET /api/balance/${params.address}`, query);

    const result = await this.transfersService.getBalance(
      params.address,
      query.chainId || 1,
      query.contractAddress,
    );

    return new BalanceResponse(result);
  }
}
