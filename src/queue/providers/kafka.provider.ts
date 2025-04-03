import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Consumer, Producer, KafkaMessage } from 'kafkajs';
import { QueueProvider } from '../queue.interface';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../logger/logger.service';

@Injectable()
export class KafkaProvider implements QueueProvider, OnModuleDestroy {
    private kafka: Kafka;
    private producer: Producer;
    private consumers: Consumer[] = [];
    private isProducerConnected = false;

    constructor(
        private readonly configService: ConfigService,
        private readonly logger: LoggerService,
    ) {
        const brokers = this.configService.get<string>('KAFKA_BROKERS', 'localhost:9092').split(',');
        const clientId = this.configService.get<string>('KAFKA_CLIENT_ID', 'email-microservice');

        this.kafka = new Kafka({
            clientId,
            brokers,
            retry: {
                initialRetryTime: 100,
                retries: 8
            },
        });

        this.producer = this.kafka.producer({
            allowAutoTopicCreation: true,
            transactionalId: 'email-producer',
        });
    }

    async onModuleDestroy() {
        if (this.isProducerConnected) {
            await this.producer.disconnect();
        }

        for (const consumer of this.consumers) {
            await consumer.disconnect();
        }

        this.logger.info('Kafka connections closed');
    }

    async connect(): Promise<void> {
        try {
            await this.producer.connect();
            this.isProducerConnected = true;
            this.logger.info('Connected to Kafka producer');
        } catch (error) {
            this.logger.error('Failed to connect to Kafka producer', {
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    async publish(topic: string, message: any, key?: string): Promise<void> {
        if (!this.isProducerConnected) {
            await this.connect();
        }

        try {
            await this.producer.send({
                topic,
                messages: [
                    {
                        key: key || String(Date.now()),
                        value: JSON.stringify(message),
                        headers: {
                            source: 'email-microservice',
                            timestamp: String(Date.now()),
                        },
                    },
                ],
            });

            this.logger.debug('Message published to Kafka', { topic });
        } catch (error) {
            this.logger.error('Failed to publish message to Kafka', {
                topic,
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    async consume(topic: string, groupId: string, callback: (msg: any) => void): Promise<void> {
        try {
            const consumer = this.kafka.consumer({ groupId });
            this.consumers.push(consumer);

            await consumer.connect();
            await consumer.subscribe({ topic, fromBeginning: false });

            await consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        const messageValue = message.value.toString();
                        const parsedMessage = JSON.parse(messageValue);

                        this.logger.debug('Received message from Kafka', {
                            topic,
                            partition,
                            offset: message.offset,
                        });

                        await callback(parsedMessage);
                    } catch (error) {
                        this.logger.error('Error processing Kafka message', {
                            topic,
                            partition,
                            offset: message.offset,
                            error: error.message,
                            stack: error.stack,
                        });
                    }
                },
            });

            this.logger.info('Kafka consumer started', { topic, groupId });
        } catch (error) {
            this.logger.error('Failed to start Kafka consumer', {
                topic,
                groupId,
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    async requeue(topic: string, message: any, key?: string, delay = 0): Promise<void> {
        if (delay > 0) {
            // For delay functionality, we'll use a different topic with the delay value in the name
            // This simulates delayed messages in Kafka (which doesn't have native delay support)
            const delayedTopic = `${topic}_delayed_${delay}`;

            // Add timestamp when the message should be processed
            message.processAfter = Date.now() + delay;

            await this.publish(delayedTopic, message, key);

            // Make sure we have a consumer for this delayed topic
            await this.setupDelayedMessageConsumer(delayedTopic, topic);
        } else {
            // No delay, publish directly to the original topic
            await this.publish(topic, message, key);
        }
    }

    private async setupDelayedMessageConsumer(delayedTopic: string, targetTopic: string): Promise<void> {
        // Check if we already have a consumer for this delayed topic
        const existingConsumer = this.consumers.find(c => c['groupId'] === `delayed-processor-${delayedTopic}`);

        if (existingConsumer) {
            return; // Consumer already exists
        }

        try {
            const consumer = this.kafka.consumer({
                groupId: `delayed-processor-${delayedTopic}`,
            });

            this.consumers.push(consumer);

            await consumer.connect();
            await consumer.subscribe({ topic: delayedTopic, fromBeginning: true });

            await consumer.run({
                eachMessage: async ({ message }) => {
                    try {
                        const messageValue = message.value.toString();
                        const parsedMessage = JSON.parse(messageValue);

                        const now = Date.now();
                        const processAfter = parsedMessage.processAfter;

                        if (now >= processAfter) {
                            // Time to process this message, forward to the original topic
                            delete parsedMessage.processAfter; // Remove the processing timestamp
                            await this.publish(targetTopic, parsedMessage);
                        } else {
                            // Not time yet, requeue with the same timestamp
                            await this.publish(delayedTopic, parsedMessage, message.key?.toString());

                            // Sleep a bit to avoid tight loop
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    } catch (error) {
                        this.logger.error('Error processing delayed message', {
                            topic: delayedTopic,
                            error: error.message,
                            stack: error.stack,
                        });
                    }
                },
            });

            this.logger.info('Delayed message consumer started', { delayedTopic, targetTopic });
        } catch (error) {
            this.logger.error('Failed to start delayed message consumer', {
                delayedTopic,
                targetTopic,
                error: error.message,
                stack: error.stack,
            });
        }
    }
}
