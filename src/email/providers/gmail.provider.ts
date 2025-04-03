import { Injectable } from '@nestjs/common';
import { EmailProvider } from './email-provider.interface';
import { SendEmailEvent, EmailSendResult } from '../types/email.types';
import { google } from 'googleapis';
import { CredentialService } from '../../credential/credential.service';
import { LoggerService } from '../../logger/logger.service';

@Injectable()
export class GmailProvider implements EmailProvider {
    constructor(
        private readonly credentialService: CredentialService,
        private readonly logger: LoggerService,
    ) { }

    async sendEmail(event: SendEmailEvent): Promise<EmailSendResult> {
        try {
            const credentials = await this.credentialService.getCredentials(
                event.userId,
                event.tenantId,
                'gmail',
            );

            if (!credentials) {
                this.logger.error('No Gmail credentials found', {
                    userId: event.userId,
                    tenantId: event.tenantId,
                });
                return {
                    success: false,
                    error: 'No credentials found for Gmail',
                };
            }

            const oauth2Client = new google.auth.OAuth2(
                process.env.GMAIL_CLIENT_ID,
                process.env.GMAIL_CLIENT_SECRET,
                process.env.GMAIL_REDIRECT_URL,
            );

            oauth2Client.setCredentials(credentials);

            const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

            // Convert the email content to a base64 encoded string
            const emailContent = [
                `To: ${event.toAddress}`,
                'Content-Type: text/html; charset=utf-8',
                'MIME-Version: 1.0',
                `Subject: ${event.subject}`,
                '',
                event.body,
            ].join('\n');

            const encodedEmail = Buffer.from(emailContent)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            const result = await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedEmail,
                },
            });

            this.logger.info('Email sent via Gmail', {
                userId: event.userId,
                tenantId: event.tenantId,
                messageId: result.data.id,
            });

            return {
                success: true,
                messageId: result.data.id,
            };
        } catch (error) {
            this.logger.error('Failed to send email via Gmail', {
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
            const oauth2Client = new google.auth.OAuth2(
                process.env.GMAIL_CLIENT_ID,
                process.env.GMAIL_CLIENT_SECRET,
                process.env.GMAIL_REDIRECT_URL,
            );

            oauth2Client.setCredentials(credentials);

            const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

            // Make a simple call to verify the credentials
            await gmail.users.getProfile({ userId: 'me' });

            return true;
        } catch (error) {
            this.logger.error('Failed to validate Gmail credentials', {
                error: error.message,
            });
            return false;
        }
    }
}