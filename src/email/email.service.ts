import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from '../queue/queue.service';
import { SendEmailEvent, EmailSendResult } from './types/email.types';
import { EmailProvider } from './providers/email-provider.interface';
import { GmailProvider } from './providers/gmail.provider';
import { OutlookProvider } from './providers/outlook.provider';
import { CredentialService } from '../credential/credential.service';
import { EmailValidatorService } from './email-validator.service';
import { EmailQuotaService } from './email-quota.service';
import { LoggerService } from '../logger/logger.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EmailService implements OnModuleInit {
    private providers: Map<string, EmailProvider> = new Map();

    constructor(
        private readonly queueService: QueueService,
        private readonly credentialService: CredentialService,
        private readonly emailValidatorService: EmailValidatorService,
        private readonly emailQuotaService: EmailQuotaService,
        private readonly gmailProvider: GmailProvider,
        private readonly outlookProvider: OutlookProvider,
        private readonly logger: LoggerService,
    ) {
        this.providers.set('gmail', gmailProvider);
        this.providers.set('outlook', outlookProvider);
    }

    async onModuleInit() {
        await this.queueService.consumeSendEmailEvents(this.processEmail.bind(this));
        this.logger.info('Email service initialized and consuming from queue');
    }

    async sendEmail(event: SendEmailEvent): Promise<void> {
        // Generate a unique ID if one doesn't exist
        if (!event.id) {
            event.id = uuidv4();
        }

        // Set initial retry count if not set
        if (event.retryCount === undefined) {
            event.retryCount = 0;
        }

        // Set creation time if not set
        if (!event.createdAt) {
            event.createdAt = new Date();
        }

        this.logger.info('Queueing email for sending', {
            id: event.id,
            userId: event.userId,
            tenantId: event.tenantId,
            to: event.toAddress,
        });

        await this.queueService.publishSendEmailEvent(event);
    }

    private async processEmail(event: SendEmailEvent): Promise<void> {
        try {
            this.logger.info('Processing email from queue', {
                id: event.id,
                userId: event.userId,
                tenantId: event.tenantId,
                to: event.toAddress,
                retryCount: event.retryCount,
            });

            // Resolve the email address (could be mapped to a specific user/tenant)
            const resolvedAddress = await this.resolveEmailAddress(event.toAddress, event.userId, event.tenantId);
            event.toAddress = resolvedAddress;

            // Validate the email address
            const isValid = await this.emailValidatorService.validateEmail(event.toAddress);
            if (!isValid) {
                this.logger.warn('Invalid email address, rejecting', {
                    id: event.id,
                    to: event.toAddress,
                });
                return; // Reject invalid emails
            }

            // Determine which provider to use based on user's credentials
            const provider = await this.determineProvider(event.userId, event.tenantId);
            if (!provider) {
                this.logger.error('No email provider available for user', {
                    id: event.id,
                    userId: event.userId,
                    tenantId: event.tenantId,
                });
                return; // No provider available
            }

            event.provider = provider;

            // Check if we have exceeded the daily quota for this provider/user
            const quotaAvailable = await this.emailQuotaService.checkQuota(
                event.userId,
                event.tenantId,
                provider,
            );

            if (!quotaAvailable) {
                this.logger.warn('Email quota exceeded, requeueing with delay', {
                    id: event.id,
                    userId: event.userId,
                    tenantId: event.tenantId,
                    provider,
                });

                // Requeue with a longer delay if quota is exceeded
                await this.queueService.requeue(event, 3600000); // 1 hour delay
                return;
            }

            // Send the email
            const emailProvider = this.providers.get(provider);
            const result = await emailProvider.sendEmail(event);

            if (result.success) {
                this.logger.info('Email sent successfully', {
                    id: event.id,
                    userId: event.userId,
                    tenantId: event.tenantId,
                    provider,
                    messageId: result.messageId,
                });

                // Record the sent email for quota tracking
                await this.emailQuotaService.recordSentEmail(
                    event.userId,
                    event.tenantId,
                    provider,
                );
            } else {
                this.logger.error('Failed to send email', {
                    id: event.id,
                    userId: event.userId,
                    tenantId: event.tenantId,
                    provider,
                    error: result.error,
                });

                // Increment retry count
                event.retryCount = (event.retryCount || 0) + 1;

                // Determine if we should retry
                if (event.retryCount < 5) {
                    // Exponential backoff: 5s, 25s, 125s, 625s, 3125s
                    const delay = Math.pow(5, event.retryCount) * 1000;
                    this.logger.info('Requeueing email for retry', {
                        id: event.id,
                        userId: event.userId,
                        tenantId: event.tenantId,
                        retryCount: event.retryCount,
                        delay,
                    });

                    await this.queueService.requeue(event, delay);
                } else {
                    this.logger.warn('Max retries reached, moving to failed queue', {
                        id: event.id,
                        userId: event.userId,
                        tenantId: event.tenantId,
                    });

                    // Move to failed queue
                    await this.queueService.publishFailedEmailEvent(event);
                }
            }
        } catch (error) {
            this.logger.error('Error processing email', {
                id: event.id,
                error: error.message,
                stack: error.stack,
            });

            // Requeue with delay on unexpected errors
            await this.queueService.requeue(event, 60000); // 1 minute delay
        }
    }

    private async resolveEmailAddress(
        toAddress: string,
        userId: string,
        tenantId: string,
    ): Promise<string> {
        // This is a placeholder - in a real system, you might have a mapping
        // of internal user IDs to their actual email addresses
        return toAddress;
    }

    private async determineProvider(userId: string, tenantId: string): Promise<string | null> {
        // Check if the user has Gmail credentials
        const gmailCredentials = await this.credentialService.getCredentials(
            userId,
            tenantId,
            'gmail',
        );

        if (gmailCredentials) {
            return 'gmail';
        }

        // Check if the user has Outlook credentials
        const outlookCredentials = await this.credentialService.getCredentials(
            userId,
            tenantId,
            'outlook',
        );

        if (outlookCredentials) {
            return 'outlook';
        }

        return null;
    }
}
