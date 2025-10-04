import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { SeedService } from './seed.service';
import {
  UsersRepository,
  TransfersRepository,
  ContractsRepository,
  IndexerStateRepository,
  ReorgsRepository,
} from './prisma/repositories';
import { WalletSubscriptionRepository } from '@/database/prisma/repositories/wallet-subscription.repository';

const repositories = [
  UsersRepository,
  TransfersRepository,
  ContractsRepository,
  IndexerStateRepository,
  ReorgsRepository,
  WalletSubscriptionRepository,
];

@Global()
@Module({
  providers: [PrismaService, SeedService, ...repositories],
  exports: [PrismaService, SeedService, ...repositories],
})
export class DatabaseModule {}
