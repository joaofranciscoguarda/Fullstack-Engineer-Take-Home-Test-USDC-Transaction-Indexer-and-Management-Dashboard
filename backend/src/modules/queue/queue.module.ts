import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';
import { QueueConfigInterface } from '@/config/queue.config';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const queueConfig = configService.get<QueueConfigInterface>('queue');
        if (!queueConfig) {
          throw new Error('Queue configuration not found');
        }

        return {
          connection: queueConfig.redis,
          defaultJobOptions: queueConfig.defaultJobOptions,
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'block-ranges' },
      { name: 'catchup' },
      { name: 'reorg-handler' },
      { name: 'wallet-notification' },
    ),
  ],
  providers: [QueueService],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
