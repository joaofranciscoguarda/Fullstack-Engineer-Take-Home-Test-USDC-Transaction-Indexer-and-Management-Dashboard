import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiQuery,
  ApiParam,
  ApiProduces,
  ApiBody,
} from '@nestjs/swagger';
import { OptionalChainIdValidationPipe } from '@/common/pipes';
import { IndexerManagementService } from './indexer-management.service';
import {
  StartIndexerDto,
  ResetIndexerDto,
  CatchUpIndexerDto,
  StopIndexerDto,
} from './dto/indexer-management.dto';
import { type SupportedChains } from '@/modules/blockchain';
import {
  IndexerStateResponseDto,
  IndexerStateResponseListDto,
} from '@/common/response/indexer-state.response';
import { ReorgResponseListDto } from '@/common/response/reorg.response';

@ApiTags('Indexer Management')
@Controller('api/indexer')
@ApiProduces('application/json')
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
  @ApiOperation({ summary: 'Get current indexer status' })
  @ApiQuery({
    name: 'chainId',
    required: false,
    description: 'Chain ID to get status for',
  })
  @ApiQuery({
    name: 'contractAddress',
    required: false,
    description: 'Contract address to get status for',
  })
  @ApiOkResponse({
    description: 'Indexer status retrieved successfully',
    type: IndexerStateResponseListDto,
  })
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
  @ApiOperation({ summary: 'Start the indexer service' })
  @ApiBody({ type: StartIndexerDto })
  @ApiOkResponse({
    description: 'Indexer started successfully',
    type: IndexerStateResponseDto,
  })
  async startIndexer(@Body() dto: StartIndexerDto) {
    return this.indexerManagementService.startIndexer(dto);
  }

  /**
   * POST /api/indexer/stop
   * Gracefully stop the indexer
   */
  @Post('stop')
  @ApiOperation({ summary: 'Stop the indexer service' })
  @ApiBody({ type: StopIndexerDto })
  @ApiOkResponse({
    description: 'Indexer stopped successfully',
    type: IndexerStateResponseDto,
  })
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
  @ApiOperation({ summary: 'Reset indexer to a specific block number' })
  @ApiBody({ type: ResetIndexerDto })
  @ApiOkResponse({
    description: 'Indexer reset successfully',
    type: IndexerStateResponseDto,
  })
  async resetIndexer(@Body() dto: ResetIndexerDto) {
    this.logger.log('POST /api/indexer/reset', dto);
    return this.indexerManagementService.resetIndexer(dto);
  }

  /**
   * GET /api/indexer/reorgs
   * List detected blockchain reorganizations
   */
  @Get('reorgs')
  @ApiOperation({ summary: 'List detected blockchain reorganizations' })
  @ApiQuery({
    name: 'chainId',
    required: false,
    description: 'Chain ID to filter reorgs',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of reorgs to return',
  })
  @ApiOkResponse({
    description: 'Reorgs retrieved successfully',
    type: ReorgResponseListDto,
  })
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
  @ApiOperation({
    summary: 'Trigger rapid catch-up indexing for large block ranges',
  })
  @ApiBody({ type: CatchUpIndexerDto })
  @ApiOkResponse({
    description: 'Catch-up job added successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Catch-up job added successfully' },
        data: {
          type: 'object',
          properties: {
            jobId: { type: 'string', example: 'catch-up-123' },
            fromBlock: { type: 'number', example: 1000000 },
            toBlock: { type: 'number', example: 1001000 },
            status: { type: 'string', example: 'queued' },
          },
        },
      },
    },
  })
  async catchUp(@Body() dto: CatchUpIndexerDto) {
    this.logger.log('POST /api/indexer/catch-up', dto);
    return this.indexerManagementService.addCatchUpJob(dto);
  }

  /**
   * GET /api/indexer/queue-metrics
   * Get queue metrics
   */
  @Get('queue-metrics')
  @ApiOperation({ summary: 'Get queue metrics' })
  @ApiOkResponse({
    description: 'Queue metrics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Queue metrics retrieved successfully',
        },
        data: {
          type: 'object',
          properties: {
            waiting: { type: 'number', example: 5 },
            active: { type: 'number', example: 2 },
            completed: { type: 'number', example: 100 },
            failed: { type: 'number', example: 3 },
            delayed: { type: 'number', example: 1 },
          },
        },
      },
    },
  })
  async getQueueMetrics() {
    this.logger.log('GET /api/indexer/queue-metrics');
    return this.indexerManagementService.getQueueMetrics();
  }
}
