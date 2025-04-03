import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { LoggerService } from './logger/logger.service';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Get services
    const configService = app.get(ConfigService);
    const loggerService = app.get(LoggerService);

    // Enable CORS
    app.enableCors();

    // Enable validation
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    // Set global prefix for API routes
    app.setGlobalPrefix('api', { exclude: ['/frontend*'] });

    // Get port from config
    const port = configService.get<number>('port', 3000);

    // Start the server
    await app.listen(port);

    loggerService.info(`Email Microservice is running on port ${port}`);
}

bootstrap();