import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { HttpModule } from '@/modules/http/http.module';
import { DatabaseModule } from '@/database/database.module';
import { QueueModule } from '@/modules/queue';
import { BlockchainModule } from '@/modules/blockchain';
import { IndexerModule } from '@/modules/indexer';
import { TransfersModule } from '@/modules/transfers';
import { IndexerManagementModule } from '@/modules/indexer-management';
import { ContractsModule } from '@/modules/contracts';
import { UsersModule } from '@/modules/users';
import { CacheModule } from '@/modules/cache';
import { ApiKeyGuard } from '@/common/guards/api-key.guard';

// Config imports
import blockchainConfig from '@/config/blockchain.config';
import queueConfig from '@/config/queue.config';
import workerConfig from '@/config/worker.config';
import staticConfig from '@/config/static.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [blockchainConfig, queueConfig, workerConfig, staticConfig],
      envFilePath: ['.env', '.env.local'],
    }),
    DatabaseModule,
    HttpModule,
    QueueModule,
    BlockchainModule,
    IndexerModule,
    TransfersModule,
    IndexerManagementModule,
    ContractsModule,
    UsersModule,
    CacheModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class AppModule {}
