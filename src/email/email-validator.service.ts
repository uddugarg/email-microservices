import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class EmailValidatorService {
    private disposableDomainsSet: Set<string> = new Set();

    constructor(private readonly logger: LoggerService) {
        // Initialize with some common disposable email domains
        this.loadDisposableDomains();
    }

    private async loadDisposableDomains() {
        try {
            // This could load from a file, an API, or a database
            const disposableDomains = [
                'mailinator.com',
                'yopmail.com',
                'guerrillamail.com',
                'tempmail.com',
                'temp-mail.org',
                'fakeinbox.com',
                'throwawaymail.com',
                'sharklasers.com',
                'trash-mail.com',
                'getairmail.com',
                // Add more as needed
            ];

            this.disposableDomainsSet = new Set(disposableDomains);
            this.logger.info('Loaded disposable domains', { count: disposableDomains.length });
        } catch (error) {
            this.logger.error('Failed to load disposable domains', { error: error.message });
        }
    }

    async validateEmail(email: string): Promise<boolean> {
        try {
            // Basic format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                this.logger.warn('Invalid email format', { email });
                return false;
            }

            // Check for disposable/temporary email domains
            const domain = email.split('@')[1].toLowerCase();
            if (this.disposableDomainsSet.has(domain)) {
                this.logger.warn('Disposable email domain detected', { email, domain });
                return false;
            }

            // Optional: Use an external API for deep validation
            // This could be replaced with an actual email validation API
            // like Mailgun, Kickbox, etc.
            /*
            const apiResponse = await axios.get(
              `https://api.email-validator.net/api/verify?EmailAddress=${encodeURIComponent(email)}&APIKey=your_api_key`
            );
            
            if (apiResponse.data.status !== 'valid') {
              this.logger.warn('Email validation API rejected email', { 
                email, 
                reason: apiResponse.data.info 
              });
              return false;
            }
            */

            return true;
        } catch (error) {
            this.logger.error('Error validating email', { email, error: error.message });
            // Default to accepting the email if validation fails
            return true;
        }
    }
}