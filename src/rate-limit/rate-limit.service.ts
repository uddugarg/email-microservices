import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class RateLimitService {
    constructor(
        private readonly redisService: RedisService,
        private readonly logger: LoggerService,
    ) { }

    async isRateLimited(
        key: string,
        limit: number,
        windowSeconds: number,
    ): Promise<boolean> {
        try {
            const currentCount = await this.redisService.get(key);

            if (!currentCount) {
                // First request in the window
                await this.redisService.set(key, '1', windowSeconds);
                return false;
            }

            const count = parseInt(currentCount, 10);

            if (count >= limit) {
                this.logger.warn('Rate limit exceeded', {
                    key,
                    count,
                    limit,
                });
                return true;
            }

            // Increment the counter
            await this.redisService.incr(key);

            return false;
        } catch (error) {
            this.logger.error('Error checking rate limit', {
                key,
                error: error.message,
                stack: error.stack,
            });

            // If there's an error, we'll allow the request
            return false;
        }
    }

    getRateLimitKey(userId: string, tenantId: string, endpoint: string): string {
        const timestamp = Math.floor(Date.now() / 1000 / 60); // Per minute window
        return `ratelimit:${userId}:${tenantId}:${endpoint}:${timestamp}`;
    }
}