export default () => ({
    port: parseInt(process.env.PORT, 10) || 3000,
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'email_service',
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
        password: process.env.REDIS_PASSWORD || '',
    },
    kafka: {
        brokers: process.env.KAFKA_BROKERS || 'localhost:9092',
        clientId: process.env.KAFKA_CLIENT_ID || 'email-microservice',
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    },
    encryption: {
        key: process.env.ENCRYPTION_KEY || 'your-encryption-key',
    },
    gmail: {
        clientId: process.env.GMAIL_CLIENT_ID || '',
        clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
        redirectUrl: process.env.GMAIL_REDIRECT_URL || 'http://localhost:3000/frontend/oauth/gmail/callback',
    },
    outlook: {
        clientId: process.env.OUTLOOK_CLIENT_ID || '',
        clientSecret: process.env.OUTLOOK_CLIENT_SECRET || '',
        redirectUrl: process.env.OUTLOOK_REDIRECT_URL || 'http://localhost:3000/frontend/oauth/outlook/callback',
    },
    rateLimit: {
        limit: parseInt(process.env.RATE_LIMIT, 10) || 60,
        windowSeconds: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 60,
    },
    logLevels: process.env.LOG_LEVELS || 'error,warn,log',
});