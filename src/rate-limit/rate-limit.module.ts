import { Module } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';
import { RateLimitGuard } from './rate-limit.guard';
import { RedisModule } from '../redis/redis.module';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '../logger/logger.module';

@Module({
    imports: [RedisModule, ConfigModule, LoggerModule],
    providers: [RateLimitService, RateLimitGuard],
    exports: [RateLimitService, RateLimitGuard],
})
export class RateLimitModule { }