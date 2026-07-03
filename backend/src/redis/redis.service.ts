import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private subscriber: Redis;
  private publisher: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const url = this.configService.get<string>('redis.url')!;
    this.client = new Redis(url, { maxRetriesPerRequest: 3 });
    this.publisher = new Redis(url);
    this.subscriber = new Redis(url);

    this.client.on('connect', () => this.logger.log('Redis client connected'));
    this.client.on('error', (err) => this.logger.error(`Redis client error: ${err.message}`));
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.client?.quit(), this.publisher?.quit(), this.subscriber?.quit()]);
  }

  getClient(): Redis {
    return this.client;
  }

  getPublisher(): Redis {
    return this.publisher;
  }

  getSubscriber(): Redis {
    return this.subscriber;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Attempts to acquire a distributed lock using SET NX PX.
   * Returns a lock token if acquired, or null if the lock is held.
   * Callers must release with releaseLock(key, token).
   */
  async acquireLock(key: string, ttlMs: number, token: string): Promise<boolean> {
    const result = await this.client.set(`lock:${key}`, token, 'PX', ttlMs, 'NX');
    return result === 'OK';
  }

  async releaseLock(key: string, token: string): Promise<boolean> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await this.client.eval(script, 1, `lock:${key}`, token);
    return result === 1;
  }
}
