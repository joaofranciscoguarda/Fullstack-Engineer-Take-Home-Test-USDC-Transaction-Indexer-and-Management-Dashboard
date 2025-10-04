import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import { OptionalChainIdValidationPipe } from '@/common/pipes';
import { IndexerManagementService } from './indexer-management.service';
import {
  StartIndexerDto,
  ResetIndexerDto,
  CatchUpIndexerDto,
  StopIndexerDto,
} from './dto/indexer-management.dto';
import { type SupportedChains } from '@/modules/blockchain';

@Controller('api/indexer')
export class IndexerManagementController {
  private readonly logger = new Logger(IndexerManagementController.name);

  constructor(
    private readonly indexerManagementService: IndexerManagementService,
  ) {}

  /**
   * GET /api/indexer/status
   * Get current indexer status (running/stopped, current block, lag, errors)
   */
  @Get('status')
  async getStatus(
    @Query('chainId', OptionalChainIdValidationPipe) chainId?: SupportedChains,
    @Query('contractAddress') contractAddress?: string,
  ) {
    this.logger.log('GET /api/indexer/status');

    if (chainId && contractAddress) {
      return this.indexerManagementService.getIndexerStatus(
        chainId,
        contractAddress,
      );
    }

    return this.indexerManagementService.getAllIndexerStatuses();
  }

  /**
   * POST /api/indexer/start
   * Start the indexer service (with optional starting block parameter)
   */
  @Post('start')
  async startIndexer(@Body() dto: StartIndexerDto) {
    return this.indexerManagementService.startIndexer(dto);
  }

  /**
   * POST /api/indexer/stop
   * Gracefully stop the indexer
   */
  @Post('stop')
  async stopIndexer(@Body() dto: StopIndexerDto) {
    return this.indexerManagementService.stopIndexer(
      dto.chainId,
      dto.contractAddress,
    );
  }

  /**
   * POST /api/indexer/reset
   * Reset indexer to a specific block number
   */
  @Post('reset')
  async resetIndexer(@Body() dto: ResetIndexerDto) {
    this.logger.log('POST /api/indexer/reset', dto);
    return this.indexerManagementService.resetIndexer(dto);
  }

  /**
   * GET /api/indexer/reorgs
   * List detected blockchain reorganizations
   */
  @Get('reorgs')
  async getReorgs(
    @Query('chainId', OptionalChainIdValidationPipe) chainId?: SupportedChains,
    @Query('limit') limit?: string,
  ) {
    this.logger.log('GET /api/indexer/reorgs');
    return this.indexerManagementService.getReorgs(
      chainId,
      limit ? parseInt(limit) : 100,
    );
  }

  /**
   * POST /api/indexer/catch-up
   * Trigger rapid catch-up indexing for large block ranges
   */
  @Post('catch-up')
  async catchUp(@Body() dto: CatchUpIndexerDto) {
    this.logger.log('POST /api/indexer/catch-up', dto);
    return this.indexerManagementService.triggerCatchUp(dto);
  }

  /**
   * GET /api/indexer/queue-metrics
   * Get queue metrics
   */
  @Get('queue-metrics')
  async getQueueMetrics() {
    this.logger.log('GET /api/indexer/queue-metrics');
    return this.indexerManagementService.getQueueMetrics();
  }
}
