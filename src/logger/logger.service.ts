import { Injectable, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LoggerService {
    private logLevels: LogLevel[] = ['error', 'warn', 'log', 'debug', 'verbose'];

    constructor(private readonly configService: ConfigService) {
        // Configure log levels from environment
        const configuredLevels = this.configService.get<string>('LOG_LEVELS');
        if (configuredLevels) {
            this.logLevels = configuredLevels.split(',') as LogLevel[];
        }
    }

    private isLogLevelEnabled(level: LogLevel): boolean {
        return this.logLevels.includes(level);
    }

    private formatMessage(message: string, context: any = {}): string {
        // Include timestamp and standardize format
        const timestamp = new Date().toISOString();

        // Create a log object with the basic properties
        const logObject = {
            timestamp,
            message,
            ...context,
        };

        // Return as a JSON string for structured logging
        return JSON.stringify(logObject);
    }

    error(message: string, context: any = {}): void {
        if (this.isLogLevelEnabled('error')) {
            console.error(this.formatMessage(message, context));
        }
    }

    warn(message: string, context: any = {}): void {
        if (this.isLogLevelEnabled('warn')) {
            console.warn(this.formatMessage(message, context));
        }
    }

    info(message: string, context: any = {}): void {
        if (this.isLogLevelEnabled('log')) {
            console.log(this.formatMessage(message, context));
        }
    }

    debug(message: string, context: any = {}): void {
        if (this.isLogLevelEnabled('debug')) {
            console.debug(this.formatMessage(message, context));
        }
    }

    verbose(message: string, context: any = {}): void {
        if (this.isLogLevelEnabled('verbose')) {
            console.log(this.formatMessage(message, context));
        }
    }
}