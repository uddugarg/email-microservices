import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '../logger/logger.module';

@Module({
    imports: [ConfigModule, LoggerModule],
    providers: [RedisService],
    exports: [RedisService],
})
export class RedisModule { }

