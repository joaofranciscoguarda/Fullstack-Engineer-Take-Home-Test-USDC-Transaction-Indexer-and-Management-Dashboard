import { Module } from '@nestjs/common';
import { IndexerManagementController } from './indexer-management.controller';
import { IndexerManagementService } from './indexer-management.service';
import { IndexerModule } from '@/modules/indexer';
import { QueueModule } from '@/modules/queue';

@Module({
  imports: [IndexerModule, QueueModule],
  controllers: [IndexerManagementController],
  providers: [IndexerManagementService],
})
export class IndexerManagementModule {}
