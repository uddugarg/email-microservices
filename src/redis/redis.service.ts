import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private client: Redis;

    constructor(
        private readonly configService: ConfigService,
        private readonly logger: LoggerService,
    ) { }

    async onModuleInit() {
        this.client = new Redis({
            host: this.configService.get<string>('REDIS_HOST', 'localhost'),
            port: this.configService.get<number>('REDIS_PORT', 6379),
            password: this.configService.get<string>('REDIS_PASSWORD', ''),
        });

        this.client.on('error', (error) => {
            this.logger.error('Redis connection error', {
                error: error.message,
                stack: error.stack,
            });
        });

        this.client.on('connect', () => {
            this.logger.info('Connected to Redis');
        });

        try {
            await this.ping();
            this.logger.info('Redis connection initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Redis connection', {
                error: error.message,
                stack: error.stack,
            });
        }
    }

    async onModuleDestroy() {
        await this.client.quit();
        this.logger.info('Redis connection closed');
    }

    async ping(): Promise<string> {
        return this.client.ping();
    }

    async get(key: string): Promise<string | null> {
        try {
            return await this.client.get(key);
        } catch (error) {
            this.logger.error('Redis get error', {
                key,
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    async set(key: string, value: string, ttl?: number): Promise<string> {
        try {
            if (ttl) {
                return await this.client.set(key, value, 'EX', ttl);
            }
            return await this.client.set(key, value);
        } catch (error) {
            this.logger.error('Redis set error', {
                key,
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    async incr(key: string): Promise<number> {
        try {
            return await this.client.incr(key);
        } catch (error) {
            this.logger.error('Redis incr error', {
                key,
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    async expire(key: string, seconds: number): Promise<number> {
        try {
            return await this.client.expire(key, seconds);
        } catch (error) {
            this.logger.error('Redis expire error', {
                key,
                seconds,
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    async del(key: string): Promise<number> {
        try {
            return await this.client.del(key);
        } catch (error) {
            this.logger.error('Redis del error', {
                key,
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }
}