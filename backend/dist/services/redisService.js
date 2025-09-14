import { createClient } from 'redis';
import { logger } from '../utils/logger.js';
export const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || undefined,
    socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
    }
});
redisClient.on('error', (err) => {
    logger.error('Redis Client Error', err);
});
redisClient.on('connect', () => {
    logger.info('Redis Client Connected');
});
redisClient.on('ready', () => {
    logger.info('Redis Client Ready');
});
redisClient.on('end', () => {
    logger.info('Redis Client Disconnected');
});
export async function initializeRedis() {
    try {
        await redisClient.connect();
        logger.info('Redis connection established');
    }
    catch (error) {
        logger.error('Failed to connect to Redis', error);
        throw error;
    }
}
export async function closeRedis() {
    try {
        await redisClient.quit();
        logger.info('Redis connection closed');
    }
    catch (error) {
        logger.error('Error closing Redis connection', error);
    }
}
//# sourceMappingURL=redisService.js.map