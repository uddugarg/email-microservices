import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { KafkaProvider } from './providers/kafka.provider';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '../logger/logger.module';

@Module({
    imports: [ConfigModule, LoggerModule],
    providers: [
        {
            provide: 'QueueProvider',
            useClass: KafkaProvider,
        },
        QueueService,
    ],
    exports: [QueueService],
})
export class QueueModule { }
