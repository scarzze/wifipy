import { PaymentService } from '../services/paymentService.js';
import { SessionService } from '../services/sessionService.js';
import { RadiusService } from '../services/radiusService.js';
import { FraudService } from '../services/fraudService.js';
import { redisClient } from '../services/redisService.js';
import { logger } from '../utils/logger.js';
const paymentService = new PaymentService();
const sessionService = new SessionService();
const radiusService = new RadiusService();
const fraudService = new FraudService();
export async function getPayments(req, res) {
    try {
        res.json({
            payments: [],
            total: 0,
            message: 'Payment history requires database implementation'
        });
    }
    catch (error) {
        logger.error('Failed to get payments', error);
        res.status(500).json({ error: 'Internal error' });
    }
}
export async function getSessions(req, res) {
    try {
        const sessions = await sessionService.getActiveSessions();
        const grants = await radiusService.listActiveGrants();
        res.json({
            sessions,
            grants,
            total: sessions.length
        });
    }
    catch (error) {
        logger.error('Failed to get sessions', error);
        res.status(500).json({ error: 'Internal error' });
    }
}
export async function revokeSession(req, res) {
    try {
        const { reference } = req.params;
        await Promise.all([
            sessionService.revokeSession(reference),
            radiusService.revokeAccess(reference)
        ]);
        logger.info('Session revoked by admin', {
            reference,
            admin: req.user?.username
        });
        res.json({ message: 'Session revoked successfully' });
    }
    catch (error) {
        logger.error('Failed to revoke session', error);
        res.status(500).json({ error: 'Internal error' });
    }
}
export async function getSystemStats(req, res) {
    try {
        const [activeSessions, activeGrants, suspiciousActivities] = await Promise.all([
            sessionService.getActiveSessions(),
            radiusService.listActiveGrants(),
            fraudService.getSuspiciousActivities(10)
        ]);
        const redisInfo = await redisClient.info('memory');
        const redisMemory = redisInfo.split('\n')
            .find(line => line.startsWith('used_memory_human:'))
            ?.split(':')[1]?.trim();
        const stats = {
            sessions: {
                active: activeSessions.length,
                total_today: activeSessions.length
            },
            payments: {
                pending: 0,
                confirmed_today: 0,
                total_revenue_today: 0
            },
            system: {
                uptime: process.uptime(),
                memory_usage: process.memoryUsage(),
                redis_memory: redisMemory,
                node_version: process.version
            },
            security: {
                suspicious_activities: suspiciousActivities.length,
                blocked_ips: 0
            }
        };
        res.json(stats);
    }
    catch (error) {
        logger.error('Failed to get system stats', error);
        res.status(500).json({ error: 'Internal error' });
    }
}
export async function getSuspiciousActivities(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const activities = await fraudService.getSuspiciousActivities(limit);
        res.json({
            activities,
            total: activities.length
        });
    }
    catch (error) {
        logger.error('Failed to get suspicious activities', error);
        res.status(500).json({ error: 'Internal error' });
    }
}
//# sourceMappingURL=adminController.js.map