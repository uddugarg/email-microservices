import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { EmailService } from './email.service';
import { SendEmailEvent } from './types/email.types';
import { AuthGuard } from '../auth/auth.guard';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';

@Controller('email')
export class EmailController {
    constructor(private readonly emailService: EmailService) { }

    @Post('send')
    @UseGuards(AuthGuard, RateLimitGuard)
    async sendEmail(@Body() emailData: SendEmailEvent) {
        await this.emailService.sendEmail(emailData);
        return { message: 'Email queued for sending' };
    }
}