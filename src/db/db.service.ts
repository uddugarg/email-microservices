import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
    private pool: Pool;

    constructor(
        private readonly configService: ConfigService,
        private readonly logger: LoggerService,
    ) { }

    async onModuleInit() {
        this.pool = new Pool({
            host: this.configService.get<string>('DB_HOST', 'localhost'),
            port: this.configService.get<number>('DB_PORT', 5432),
            user: this.configService.get<string>('DB_USER', 'postgres'),
            password: this.configService.get<string>('DB_PASSWORD', 'postgres'),
            database: this.configService.get<string>('DB_NAME', 'email_service'),
        });

        this.logger.info('Database connection initialized');

        // Initialize database schema
        await this.initializeSchema();
    }

    async onModuleDestroy() {
        await this.pool.end();
        this.logger.info('Database connection closed');
    }

    async query(text: string, params: any[] = []): Promise<QueryResult> {
        try {
            const start = Date.now();
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;

            this.logger.debug('Executed query', {
                query: text,
                duration,
                rows: result.rowCount,
            });

            return result;
        } catch (error) {
            this.logger.error('Database query error', {
                query: text,
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    private async initializeSchema() {
        try {
            // Create the credentials table if it doesn't exist
            await this.query(`
        CREATE TABLE IF NOT EXISTS credentials (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          tenant_id VARCHAR(255) NOT NULL,
          provider VARCHAR(100) NOT NULL,
          credentials TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP NOT NULL,
          UNIQUE(user_id, tenant_id, provider)
        );
      `);

            // Create an index for faster lookups
            await this.query(`
        CREATE INDEX IF NOT EXISTS idx_credentials_lookup
        ON credentials(user_id, tenant_id, provider);
      `);

            // Create email_logs table for tracking emails
            await this.query(`
        CREATE TABLE IF NOT EXISTS email_logs (
          id SERIAL PRIMARY KEY,
          message_id VARCHAR(255),
          user_id VARCHAR(255) NOT NULL,
          tenant_id VARCHAR(255) NOT NULL,
          provider VARCHAR(100) NOT NULL,
          to_address VARCHAR(255) NOT NULL,
          subject VARCHAR(255) NOT NULL,
          status VARCHAR(50) NOT NULL,
          error_message TEXT,
          created_at TIMESTAMP NOT NULL
        );
      `);

            // Create an index for email logs
            await this.query(`
        CREATE INDEX IF NOT EXISTS idx_email_logs_lookup
        ON email_logs(user_id, tenant_id, created_at);
      `);

            this.logger.info('Database schema initialized');
        } catch (error) {
            this.logger.error('Failed to initialize database schema', {
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }
}
