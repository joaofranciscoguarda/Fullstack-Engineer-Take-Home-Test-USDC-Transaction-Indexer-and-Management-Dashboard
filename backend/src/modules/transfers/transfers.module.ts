import { Module } from '@nestjs/common';
import { TransfersController, BalanceController } from './transfers.controller';
import { TransfersService } from './transfers.service';
import { CacheInterceptor } from '@/common/interceptors';
import { CacheService } from '@/modules/cache';

@Module({
  controllers: [TransfersController, BalanceController],
  providers: [TransfersService, CacheInterceptor, CacheService],
  exports: [TransfersService],
})
export class TransfersModule {}
