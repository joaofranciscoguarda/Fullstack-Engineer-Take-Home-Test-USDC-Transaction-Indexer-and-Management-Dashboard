import { WalletSubscription } from '@/common/models';
import { PrismaService } from '@/database/prisma/prisma.service';
import { BaseRepository } from '@/database/prisma/repositories/base.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WalletSubscriptionRepository extends BaseRepository<
  WalletSubscription,
  'WalletSubscriptions'
> {
  constructor(protected prisma: PrismaService) {
    super(prisma, 'WalletSubscriptions', WalletSubscription);
  }
}
