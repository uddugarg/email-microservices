import { Injectable } from '@nestjs/common';
import { EmailProvider } from './email-provider.interface';
import { SendEmailEvent, EmailSendResult } from '../types/email.types';
import { Client } from '@microsoft/microsoft-graph-client';
import { CredentialService } from '../../credential/credential.service';
import { LoggerService } from '../../logger/logger.service';

@Injectable()
export class OutlookProvider implements EmailProvider {
    constructor(
        private readonly credentialService: CredentialService,
        private readonly logger: LoggerService,
    ) { }

    async sendEmail(event: SendEmailEvent): Promise<EmailSendResult> {
        try {
            const credentials = await this.credentialService.getCredentials(
                event.userId,
                event.tenantId,
                'outlook',
            );

            if (!credentials) {
                this.logger.error('No Outlook credentials found', {
                    userId: event.userId,
                    tenantId: event.tenantId,
                });
                return {
                    success: false,
                    error: 'No credentials found for Outlook',
                };
            }

            // Initialize Microsoft Graph client
            const client = Client.init({
                authProvider: (done) => {
                    done(null, credentials.accessToken);
                },
            });

            // Construct the email
            const email = {
                message: {
                    subject: event.subject,
                    body: {
                        contentType: 'HTML',
                        content: event.body,
                    },
                    toRecipients: [
                        {
                            emailAddress: {
                                address: event.toAddress,
                            },
                        },
                    ],
                },
            };

            // Send the email
            const result = await client.api('/me/sendMail').post(email);

            this.logger.info('Email sent via Outlook', {
                userId: event.userId,
                tenantId: event.tenantId,
            });

            return {
                success: true,
                messageId: 'outlook-sent', // Outlook doesn't return a message ID
            };
        } catch (error) {
            this.logger.error('Failed to send email via Outlook', {
                userId: event.userId,
                tenantId: event.tenantId,
                error: error.message,
                stack: error.stack,
            });

            return {
                success: false,
                error: error.message,
            };
        }
    }

    async validateCredentials(credentials: any): Promise<boolean> {
        try {
            const client = Client.init({
                authProvider: (done) => {
                    done(null, credentials.accessToken);
                },
            });

            // Make a simple call to verify the credentials
            await client.api('/me').get();

            return true;
        } catch (error) {
            this.logger.error('Failed to validate Outlook credentials', {
                error: error.message,
            });
            return false;
        }
    }
}