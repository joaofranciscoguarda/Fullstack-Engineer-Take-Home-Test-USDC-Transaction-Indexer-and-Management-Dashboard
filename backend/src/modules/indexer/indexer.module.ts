import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import {
  CoordinatorService,
  ReorgDetectionService,
  ChunkSizeManagerService,
  ErrorHandlerService,
} from './services';
import {
  BlockRangeConsumer,
  CatchupConsumer,
  ReorgConsumer,
} from './consumers';
import { QueueModule } from '@/modules/queue';
import { BlockchainModule } from '@/modules/blockchain';
import { DatabaseModule } from '@/database/database.module';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    QueueModule,
    BlockchainModule.forFeature(),
    DatabaseModule,
  ],
  providers: [
    // Core coordination services
    CoordinatorService,
    ReorgDetectionService,
    ChunkSizeManagerService,
    ErrorHandlerService,

    // Consumers
    BlockRangeConsumer,
    CatchupConsumer,
    ReorgConsumer,
  ],
  exports: [CoordinatorService],
})
export class IndexerModule {}
