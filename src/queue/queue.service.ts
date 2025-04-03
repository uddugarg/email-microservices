import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { QueueProvider } from './queue.interface';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class QueueService implements OnModuleInit {
    private static readonly SEND_EMAIL_TOPIC = 'send-email-topic';
    private static readonly FAILED_EMAIL_TOPIC = 'failed-email-topic';
    private static readonly CONSUMER_GROUP_ID = 'email-service-group';

    constructor(
        @Inject('QueueProvider') private readonly queueProvider: QueueProvider,
        private readonly logger: LoggerService,
    ) { }

    async onModuleInit() {
        await this.connect();
    }

    async connect() {
        await this.queueProvider.connect();
    }

    async publishSendEmailEvent(event: any) {
        await this.queueProvider.publish(QueueService.SEND_EMAIL_TOPIC, event, event.id);
    }

    async consumeSendEmailEvents(callback: (msg: any) => void) {
        await this.queueProvider.consume(
            QueueService.SEND_EMAIL_TOPIC,
            QueueService.CONSUMER_GROUP_ID,
            callback,
        );
    }

    async requeue(event: any, delay = 0) {
        await this.queueProvider.requeue(QueueService.SEND_EMAIL_TOPIC, event, event.id, delay);
    }

    async publishFailedEmailEvent(event: any) {
        await this.queueProvider.publish(QueueService.FAILED_EMAIL_TOPIC, event, event.id);
    }
}
