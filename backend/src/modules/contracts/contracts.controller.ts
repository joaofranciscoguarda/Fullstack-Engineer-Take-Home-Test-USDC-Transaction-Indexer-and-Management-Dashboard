import { Controller, Get, Post, Body, Logger } from '@nestjs/common';
import { Public } from '@/common/decorators/public.decorator';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/contracts.dto';

@Controller('api/contracts')
export class ContractsController {
  private readonly logger = new Logger(ContractsController.name);

  constructor(private readonly contractsService: ContractsService) {}

  /**
   * POST /api/contracts
   * Add a new contract to index
   */
  @Post()
  async createContract(@Body() dto: CreateContractDto) {
    this.logger.log('POST /api/contracts', dto);
    return this.contractsService.createContract(dto);
  }

  /**
   * GET /api/contracts
   * List all contracts
   */
  @Public()
  @Get()
  async listContracts() {
    this.logger.log('GET /api/contracts');
    return this.contractsService.listContracts();
  }
}
