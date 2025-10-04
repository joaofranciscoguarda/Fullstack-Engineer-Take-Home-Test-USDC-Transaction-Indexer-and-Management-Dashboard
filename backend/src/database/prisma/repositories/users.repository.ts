import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { User } from '../../../common/models/user.model';
import { BaseRepository } from './base.repository';

@Injectable()
export class UsersRepository extends BaseRepository<User, 'Users'> {
  constructor(protected prisma: PrismaService) {
    super(prisma, 'Users', User);
  }

  async findApiKey(value: string): Promise<User | null> {
    const user = await this.prisma.users.findFirst({
      where: {
        api_key: value,
      },
    });

    return user ? User.hydrate<User>(user) : null;
  }
}
