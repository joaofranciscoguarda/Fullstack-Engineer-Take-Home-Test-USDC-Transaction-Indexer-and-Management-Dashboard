import { Module } from '@nestjs/common';
import { TransfersModule } from '@/modules/transfers';
import { ContractsModule } from '@/modules/contracts';
import { IndexerManagementModule } from '@/modules/indexer-management';

@Module({
  imports: [TransfersModule, ContractsModule, IndexerManagementModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class HttpModule {}
