import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class EmailQuotaService {
    constructor(
        private readonly redisService: RedisService,
        private readonly logger: LoggerService,
    ) { }

    async checkQuota(userId: string, tenantId: string, provider: string): Promise<boolean> {
        try {
            const key = this.getQuotaKey(userId, tenantId, provider);
            const todayCount = await this.redisService.get(key);

            if (!todayCount) {
                return true; // No emails sent today yet
            }

            const count = parseInt(todayCount, 10);
            const dailyLimit = this.getDailyLimit(userId, tenantId, provider);

            this.logger.info('Checking quota', {
                userId,
                tenantId,
                provider,
                currentCount: count,
                dailyLimit
            });

            return count < dailyLimit;
        } catch (error) {
            this.logger.error('Error checking quota', {
                userId,
                tenantId,
                provider,
                error: error.message
            });

            // If there's an error, we'll allow the email to be sent
            return true;
        }
    }

    async recordSentEmail(userId: string, tenantId: string, provider: string): Promise<void> {
        try {
            const key = this.getQuotaKey(userId, tenantId, provider);

            // Increment the count
            await this.redisService.incr(key);

            // Make sure the key expires at the end of the day (UTC)
            const now = new Date();
            const endOfDay = new Date(
                Date.UTC(
                    now.getUTCFullYear(),
                    now.getUTCMonth(),
                    now.getUTCDate(),
                    23, 59, 59, 999
                )
            );

            const ttlSeconds = Math.floor((endOfDay.getTime() - now.getTime()) / 1000);

            if (ttlSeconds > 0) {
                await this.redisService.expire(key, ttlSeconds);
            }

            this.logger.info('Recorded sent email for quota', {
                userId,
                tenantId,
                provider
            });
        } catch (error) {
            this.logger.error('Error recording sent email for quota', {
                userId,
                tenantId,
                provider,
                error: error.message
            });
        }
    }

    private getQuotaKey(userId: string, tenantId: string, provider: string): string {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        return `email:quota:${tenantId}:${userId}:${provider}:${today}`;
    }

    private getDailyLimit(userId: string, tenantId: string, provider: string): number {
        // This is a simplified implementation
        // In a real-world scenario, this would be more dynamic and could be stored in a database

        // Example of a warming-up strategy:
        // - Day 1-7: 50 emails per day
        // - Day 8-14: 100 emails per day
        // - Day 15-30: 200 emails per day
        // - After day 30: 500 emails per day

        // For this implementation, we'll just use a fixed limit
        const defaultLimits = {
            gmail: 100,
            outlook: 100,
        };

        return defaultLimits[provider] || 50;
    }
}