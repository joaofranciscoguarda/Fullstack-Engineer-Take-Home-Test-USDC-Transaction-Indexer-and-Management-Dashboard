import { Module } from '@nestjs/common';
import { IndexerManagementController } from './indexer-management.controller';
import { IndexerManagementService } from './indexer-management.service';
import { IndexerModule } from '@/modules/indexer';
import { QueueModule } from '@/modules/queue';
import { BlockchainModule } from '@/modules/blockchain';

@Module({
  imports: [IndexerModule, QueueModule, BlockchainModule.forFeature()],
  controllers: [IndexerManagementController],
  providers: [IndexerManagementService],
})
export class IndexerManagementModule {}
