import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import paymentRouter from './routes/payment.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import { initializeRedis } from './services/redisService.js';
dotenv.config();
const app = express();
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://yourdomain.com']
        : ['http://localhost:3000', 'http://192.168.1.1:3000'],
    credentials: true
}));
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/payments', paymentRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
app.get('/generate_204', (_req, res) => res.status(204).send());
app.get('/hotspot-detect.html', (_req, res) => res.redirect(process.env.CAPTIVE_PORTAL_URL || 'http://192.168.1.1:3000'));
app.use(errorHandler);
const port = process.env.PORT || 4000;
async function startServer() {
    try {
        await initializeRedis();
        app.listen(port, () => {
            logger.info(`🚀 Captive Portal Backend running on port ${port}`);
            logger.info(`Environment: ${process.env.NODE_ENV}`);
        });
    }
    catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=app.js.map