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

const repositories = [
  UsersRepository,
  TransfersRepository,
  ContractsRepository,
  IndexerStateRepository,
  ReorgsRepository,
];

@Global()
@Module({
  providers: [PrismaService, SeedService, ...repositories],
  exports: [PrismaService, SeedService, ...repositories],
})
export class DatabaseModule {}
