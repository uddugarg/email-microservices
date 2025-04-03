import { Module } from '@nestjs/common';
import { DbService } from './db.service';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '../logger/logger.module';

@Module({
    imports: [ConfigModule, LoggerModule],
    providers: [DbService],
    exports: [DbService],
})
export class DbModule { }