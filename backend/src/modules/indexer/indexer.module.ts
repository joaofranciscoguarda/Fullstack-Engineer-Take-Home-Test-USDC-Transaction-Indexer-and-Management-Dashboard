import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { CoordinatorService } from './services/coordinator.service';
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
    ScheduleModule.forRoot(), // For cron jobs
    QueueModule,
    BlockchainModule.forFeature(),
    DatabaseModule,
  ],
  providers: [
    CoordinatorService,
    BlockRangeConsumer,
    CatchupConsumer,
    ReorgConsumer,
  ],
  exports: [CoordinatorService],
})
export class IndexerModule {}
