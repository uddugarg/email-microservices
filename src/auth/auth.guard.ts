import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly authService: AuthService,
        private readonly logger: LoggerService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;

        if (!authHeader) {
            this.logger.warn('Missing authorization header');
            throw new UnauthorizedException('Missing authorization header');
        }

        const [type, token] = authHeader.split(' ');

        if (type !== 'Bearer' || !token) {
            this.logger.warn('Invalid authorization format');
            throw new UnauthorizedException('Invalid authorization format');
        }

        const payload = await this.authService.validateToken(token);

        if (!payload) {
            this.logger.warn('Invalid token');
            throw new UnauthorizedException('Invalid token');
        }

        // Attach user info to request for later use
        request.user = {
            userId: payload.sub,
            tenantId: payload.tenantId,
        };

        return true;
    }
}