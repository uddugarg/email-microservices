import {
    Injectable,
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
    constructor(
        private readonly rateLimitService: RateLimitService,
        private readonly configService: ConfigService,
        private readonly logger: LoggerService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.userId || 'anonymous';
        const tenantId = request.user?.tenantId || 'anonymous';
        const endpoint = request.path;

        // Get rate limit settings from config or use defaults
        const limit = this.configService.get<number>('RATE_LIMIT', 60); // 60 requests
        const windowSeconds = this.configService.get<number>('RATE_LIMIT_WINDOW', 60); // per minute

        const key = this.rateLimitService.getRateLimitKey(userId, tenantId, endpoint);

        const isLimited = await this.rateLimitService.isRateLimited(
            key,
            limit,
            windowSeconds,
        );

        if (isLimited) {
            this.logger.warn('Rate limit exceeded', {
                userId,
                tenantId,
                endpoint,
                limit,
                windowSeconds,
            });

            throw new HttpException(
                'Too many requests, please try again later.',
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        return true;
    }
}
