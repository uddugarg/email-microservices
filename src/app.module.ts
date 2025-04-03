import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailModule } from './email/email.module';
import { QueueModule } from './queue/queue.module';
import { AuthModule } from './auth/auth.module';
import { DbModule } from './db/db.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { CredentialModule } from './credential/credential.module';
import { FrontendModule } from './frontend/frontend.module';
import { RedisModule } from './redis/redis.module';
import { LoggerModule } from './logger/logger.module';
import { EncryptionModule } from './encryption/encryption.module';
import configuration from './config/configuration';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [configuration],
        }),
        LoggerModule,
        DbModule,
        RedisModule,
        EncryptionModule,
        QueueModule,
        AuthModule,
        RateLimitModule,
        CredentialModule,
        EmailModule,
        FrontendModule,
    ],
})
export class AppModule { }