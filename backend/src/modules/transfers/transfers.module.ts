import { Module } from '@nestjs/common';
import { TransfersController, BalanceController } from './transfers.controller';
import { TransfersService } from './transfers.service';

@Module({
  controllers: [TransfersController, BalanceController],
  providers: [TransfersService],
  exports: [TransfersService],
})
export class TransfersModule {}
