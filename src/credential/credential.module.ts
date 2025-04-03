import { Module } from '@nestjs/common';
import { CredentialService } from './credential.service';
import { CredentialController } from './credential.controller';
import { DbModule } from '../db/db.module';
import { LoggerModule } from '../logger/logger.module';
import { EncryptionModule } from '../encryption/encryption.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
    imports: [DbModule, LoggerModule, EncryptionModule, AuthModule],
    controllers: [CredentialController],
    providers: [CredentialService],
    exports: [CredentialService],
})
export class CredentialModule { }