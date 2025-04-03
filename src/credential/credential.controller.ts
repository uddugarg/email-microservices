import { Controller, Post, Get, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CredentialService } from './credential.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('credentials')
@UseGuards(AuthGuard)
export class CredentialController {
    constructor(private readonly credentialService: CredentialService) { }

    @Post()
    async storeCredentials(
        @Body() body: { userId: string; tenantId: string; provider: string; credentials: any },
    ) {
        await this.credentialService.store(
            body.userId,
            body.tenantId,
            body.provider,
            body.credentials,
        );
        return { message: 'Credentials stored successfully' };
    }

    @Get(':userId/:tenantId/:provider')
    async getCredentials(
        @Param('userId') userId: string,
        @Param('tenantId') tenantId: string,
        @Param('provider') provider: string,
    ) {
        const credentials = await this.credentialService.getCredentials(
            userId,
            tenantId,
            provider,
        );
        if (!credentials) {
            return { message: 'No credentials found' };
        }
        return { message: 'Credentials found', hasCredentials: true };
    }

    @Delete(':userId/:tenantId/:provider')
    async deleteCredentials(
        @Param('userId') userId: string,
        @Param('tenantId') tenantId: string,
        @Param('provider') provider: string,
    ) {
        const deleted = await this.credentialService.deleteCredentials(
            userId,
            tenantId,
            provider,
        );
        if (deleted) {
            return { message: 'Credentials deleted successfully' };
        }
        return { message: 'No credentials found to delete' };
    }

    @Get(':userId/:tenantId/providers')
    async listProviders(
        @Param('userId') userId: string,
        @Param('tenantId') tenantId: string,
    ) {
        const providers = await this.credentialService.listProviders(userId, tenantId);
        return { providers };
    }
}