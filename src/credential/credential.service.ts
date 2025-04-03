import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { Credential } from './models/credential.entity';
import { LoggerService } from '../logger/logger.service';
import { EncryptionService } from '../encryption/encryption.service';

@Injectable()
export class CredentialService {
    constructor(
        private readonly dbService: DbService,
        private readonly loggerService: LoggerService,
        private readonly encryptionService: EncryptionService,
    ) { }

    async store(userId: string, tenantId: string, provider: string, credentials: any): Promise<void> {
        try {
            this.loggerService.info('Storing credentials', {
                userId,
                tenantId,
                provider,
            });

            // Encrypt sensitive credentials before storing
            const encryptedCredentials = this.encryptionService.encrypt(
                JSON.stringify(credentials),
            );

            // Check if credentials already exist for this user, tenant, and provider
            const existingCredential = await this.dbService.query(
                'SELECT id FROM credentials WHERE user_id = $1 AND tenant_id = $2 AND provider = $3',
                [userId, tenantId, provider],
            );

            if (existingCredential.rows.length > 0) {
                // Update existing credentials
                await this.dbService.query(
                    'UPDATE credentials SET credentials = $1, updated_at = NOW() WHERE user_id = $2 AND tenant_id = $3 AND provider = $4',
                    [encryptedCredentials, userId, tenantId, provider],
                );
            } else {
                // Insert new credentials
                await this.dbService.query(
                    'INSERT INTO credentials (user_id, tenant_id, provider, credentials, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
                    [userId, tenantId, provider, encryptedCredentials],
                );
            }

            this.loggerService.info('Credentials stored successfully', {
                userId,
                tenantId,
                provider,
            });
        } catch (error) {
            this.loggerService.error('Failed to store credentials', {
                userId,
                tenantId,
                provider,
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    async getCredentials(
        userId: string,
        tenantId: string,
        provider: string,
    ): Promise<any | null> {
        try {
            this.loggerService.info('Retrieving credentials', {
                userId,
                tenantId,
                provider,
            });

            const result = await this.dbService.query(
                'SELECT credentials FROM credentials WHERE user_id = $1 AND tenant_id = $2 AND provider = $3',
                [userId, tenantId, provider],
            );

            if (result.rows.length === 0) {
                this.loggerService.warn('No credentials found', {
                    userId,
                    tenantId,
                    provider,
                });
                return null;
            }

            // Decrypt the stored credentials
            const decryptedCredentials = this.encryptionService.decrypt(
                result.rows[0].credentials,
            );

            return JSON.parse(decryptedCredentials);
        } catch (error) {
            this.loggerService.error('Failed to retrieve credentials', {
                userId,
                tenantId,
                provider,
                error: error.message,
                stack: error.stack,
            });
            return null;
        }
    }

    async deleteCredentials(
        userId: string,
        tenantId: string,
        provider: string,
    ): Promise<boolean> {
        try {
            this.loggerService.info('Deleting credentials', {
                userId,
                tenantId,
                provider,
            });

            const result = await this.dbService.query(
                'DELETE FROM credentials WHERE user_id = $1 AND tenant_id = $2 AND provider = $3',
                [userId, tenantId, provider],
            );

            const deleted = result.rowCount > 0;

            if (deleted) {
                this.loggerService.info('Credentials deleted successfully', {
                    userId,
                    tenantId,
                    provider,
                });
            } else {
                this.loggerService.warn('No credentials found to delete', {
                    userId,
                    tenantId,
                    provider,
                });
            }

            return deleted;
        } catch (error) {
            this.loggerService.error('Failed to delete credentials', {
                userId,
                tenantId,
                provider,
                error: error.message,
                stack: error.stack,
            });
            return false;
        }
    }

    async listProviders(userId: string, tenantId: string): Promise<string[]> {
        try {
            this.loggerService.info('Listing credential providers', {
                userId,
                tenantId,
            });

            const result = await this.dbService.query(
                'SELECT provider FROM credentials WHERE user_id = $1 AND tenant_id = $2',
                [userId, tenantId],
            );

            return result.rows.map((row) => row.provider);
        } catch (error) {
            this.loggerService.error('Failed to list credential providers', {
                userId,
                tenantId,
                error: error.message,
                stack: error.stack,
            });
            return [];
        }
    }
}
