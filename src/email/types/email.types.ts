export interface SendEmailEvent {
    id?: string;
    toAddress: string;
    tenantId: string;
    userId: string;
    subject: string;
    body: string;
    retryCount?: number;
    createdAt?: Date;
    provider?: string;
}

export interface EmailSendResult {
    success: boolean;
    messageId?: string;
    error?: string;
}