import { logger } from '../utils/logger.js';
export function errorHandler(error, req, res, next) {
    logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : error.message;
    res.status(500).json({
        error: 'internal_error',
        message
    });
}
//# sourceMappingURL=errorHandler.js.map