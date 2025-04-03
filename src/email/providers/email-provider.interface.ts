import { SendEmailEvent, EmailSendResult } from '../types/email.types';

export interface EmailProvider {
    sendEmail(event: SendEmailEvent): Promise<EmailSendResult>;
    validateCredentials(credentials: any): Promise<boolean>;
}
