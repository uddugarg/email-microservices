import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
    private readonly algorithm = 'aes-256-gcm';
    private readonly key: Buffer;

    constructor(private readonly configService: ConfigService) {
        const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');

        if (!encryptionKey) {
            throw new Error('ENCRYPTION_KEY environment variable is required');
        }

        // Generate a 32-byte key from the provided encryption key
        this.key = crypto.createHash('sha256').update(encryptionKey).digest();
    }

    encrypt(text: string): string {
        // Generate a random initialization vector
        const iv = crypto.randomBytes(16);

        // Create cipher
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

        // Encrypt the text
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Get the authentication tag
        const authTag = cipher.getAuthTag();

        // Return the IV, encrypted text, and authentication tag as a combined string
        return iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');
    }

    decrypt(encryptedText: string): string {
        // Split the encrypted text into IV, encrypted data, and authentication tag
        const parts = encryptedText.split(':');

        if (parts.length !== 3) {
            throw new Error('Invalid encrypted text format');
        }

        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        const authTag = Buffer.from(parts[2], 'hex');

        // Create decipher
        const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
        decipher.setAuthTag(authTag);

        // Decrypt the text
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }
}
