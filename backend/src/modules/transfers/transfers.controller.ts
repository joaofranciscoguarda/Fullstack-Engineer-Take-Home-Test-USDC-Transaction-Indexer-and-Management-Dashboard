import {
  Controller,
  Get,
  Param,
  Query,
  Logger,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiQuery,
  ApiParam,
  ApiProduces,
} from '@nestjs/swagger';
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
  TransferResponseDto,
  TransferResponseListDto,
} from '@/common/response/transfer.response';
import {
  BalanceResponse,
  BalanceResponseDto,
} from '@/common/response/balance.response';

@ApiTags('Transfers')
@Public()
@ApiProduces('application/json')
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
  @ApiOperation({ summary: 'Get transfers with filtering options' })
  @ApiOkResponse({
    description: 'List of transfers retrieved successfully',
    type: TransferResponseListDto,
  })
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
  @ApiParam({
    name: 'address',
    description: 'Wallet address to query transfers for',
  })
  @ApiOkResponse({
    description: 'List of transfers for the address retrieved successfully',
    type: TransferResponseListDto,
  })
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
  @ApiOperation({ summary: 'Get specific transfer by transaction hash' })
  @ApiParam({ name: 'txHash', description: 'Transaction hash to query' })
  @ApiQuery({
    name: 'chainId',
    required: false,
    description: 'Chain ID (defaults to mainnet)',
  })
  @ApiOkResponse({
    description: 'Transfer retrieved successfully',
    type: TransferResponseDto,
  })
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

@ApiTags('Balance')
@Public()
@ApiProduces('application/json')
@Controller('api/balance')
@UseInterceptors(CacheInterceptor)
export class BalanceController {
  private readonly logger = new Logger(BalanceController.name);

  constructor(private readonly transfersService: TransfersService) {}

  /**
   * GET /api/balance/:address
   * Calculate current USDC balance for an address using indexed data
   */
  @Public()
  @Get(':address')
  @ApiOperation({ summary: 'Get USDC balance for an address' })
  @ApiParam({
    name: 'address',
    description: 'Wallet address to get balance for',
  })
  @ApiQuery({
    name: 'chainId',
    required: false,
    description: 'Chain ID (defaults to mainnet)',
  })
  @ApiQuery({
    name: 'contractAddress',
    required: false,
    description: 'USDC contract address',
  })
  @ApiOkResponse({
    description: 'Balance retrieved successfully',
    type: BalanceResponseDto,
  })
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
