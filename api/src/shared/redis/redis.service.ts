import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(configService: ConfigService) {
    const redisUrl =
      configService.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    this.redis = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  }

  async setJson(key: string, value: unknown, ttlSec: number): Promise<void> {
    const payload = JSON.stringify(value);
    await this.redis.set(key, payload, 'EX', ttlSec);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async getInt(key: string, fallback: number): Promise<number> {
    const value = await this.redis.get(key);
    if (!value) return fallback;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  async incr(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
