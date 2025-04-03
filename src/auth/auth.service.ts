import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly logger: LoggerService,
    ) { }

    async validateToken(token: string): Promise<any> {
        try {
            const payload = this.jwtService.verify(token, {
                secret: this.configService.get<string>('JWT_SECRET'),
            });
            return payload;
        } catch (error) {
            this.logger.warn('Invalid JWT token', {
                error: error.message,
            });
            return null;
        }
    }

    generateToken(userId: string, tenantId: string): string {
        try {
            const payload = { sub: userId, tenantId };
            return this.jwtService.sign(payload);
        } catch (error) {
            this.logger.error('Failed to generate JWT token', {
                userId,
                tenantId,
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }
}