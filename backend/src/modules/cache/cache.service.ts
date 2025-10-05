import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis;

  constructor(private readonly configService: ConfigService) {
    const redisConfig = this.configService.get('queue.redis');
    this.redis = new Redis(redisConfig);
  }

  async set(
    key: string,
    value: string,
    ttlSeconds: number = 300,
  ): Promise<void> {
    await this.redis.setex(key, ttlSeconds, value);
  }

  async get(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
