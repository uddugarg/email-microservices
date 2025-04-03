import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { QueueModule } from '../queue/queue.module';
import { CredentialModule } from '../credential/credential.module';
import { RedisModule } from '../redis/redis.module';
import { LoggerModule } from '../logger/logger.module';
import { EmailValidatorService } from './email-validator.service';
import { EmailQuotaService } from './email-quota.service';
import { GmailProvider } from './providers/gmail.provider';
import { OutlookProvider } from './providers/outlook.provider';
import { AuthModule } from 'src/auth/auth.module';
import { RateLimitModule } from 'src/rate-limit/rate-limit.module';

@Module({
    imports: [
        QueueModule,
        CredentialModule,
        RedisModule,
        LoggerModule,
        AuthModule,
        RateLimitModule
    ],
    controllers: [EmailController],
    providers: [
        EmailService,
        EmailValidatorService,
        EmailQuotaService,
        GmailProvider,
        OutlookProvider,
    ],
    exports: [EmailService],
})
export class EmailModule { }