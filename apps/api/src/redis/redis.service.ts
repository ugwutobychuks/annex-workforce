import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(config: ConfigService) {
    const url = config.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.client = new Redis(url, {
      retryStrategy: (times) => Math.min(times * 100, 3000),
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });
    this.client.on('connect', () => this.logger.log('🔌 Redis connected'));
    this.client.on('error', (err) => this.logger.error('Redis error', err.message));
  }

  getClient(): Redis {
    return this.client;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) await this.client.setex(key, ttlSeconds, value);
    else await this.client.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string | string[]): Promise<void> {
    await this.client.del(Array.isArray(key) ? key : [key]);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const val = await this.client.incr(key);
    if (val === 1 && ttlSeconds) await this.client.expire(key, ttlSeconds);
    return val;
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
