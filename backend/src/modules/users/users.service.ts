import { Injectable } from '@nestjs/common';
import { UsersRepository } from '@/database/prisma/repositories';
import { User } from '@/common/models';
import { randomBytes } from 'crypto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  /**
   * Generate a new API key for a user
   */
  async generateApiKey(role: string = 'user'): Promise<User> {
    const apiKey = this.createApiKey();

    const user = await this.usersRepository.create(
      new User({
        api_key: apiKey,
      }),
    );

    return user;
  }

  /**
   * Create a secure random API key
   */
  private createApiKey(): string {
    return `idx_${randomBytes(32).toString('hex')}`;
  }
}
