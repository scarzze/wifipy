import { Request, Response } from 'express';
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

export async function getPayments(req: Request, res: Response) {
  try {
    // This would typically query a database
    // For now, we'll return a placeholder response
    res.json({
      payments: [],
      total: 0,
      message: 'Payment history requires database implementation'
    });
  } catch (error) {
    logger.error('Failed to get payments', error);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function getSessions(req: Request, res: Response) {
  try {
    const sessions = await sessionService.getActiveSessions();
    const grants = await radiusService.listActiveGrants();
    
    res.json({
      sessions,
      grants,
      total: sessions.length
    });
  } catch (error) {
    logger.error('Failed to get sessions', error);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function revokeSession(req: Request, res: Response) {
  try {
    const { reference } = req.params;
    
    await Promise.all([
      sessionService.revokeSession(reference),
      radiusService.revokeAccess(reference)
    ]);
    
    logger.info('Session revoked by admin', { 
      reference, 
      admin: (req as any).user?.username 
    });
    
    res.json({ message: 'Session revoked successfully' });
  } catch (error) {
    logger.error('Failed to revoke session', error);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function getSystemStats(req: Request, res: Response) {
  try {
    const [
      activeSessions,
      activeGrants,
      suspiciousActivities
    ] = await Promise.all([
      sessionService.getActiveSessions(),
      radiusService.listActiveGrants(),
      fraudService.getSuspiciousActivities(10)
    ]);
    
    // Redis stats
    const redisInfo = await redisClient.info('memory');
    const redisMemory = redisInfo.split('\n')
      .find(line => line.startsWith('used_memory_human:'))
      ?.split(':')[1]?.trim();
    
    const stats = {
      sessions: {
        active: activeSessions.length,
        total_today: activeSessions.length // Placeholder
      },
      payments: {
        pending: 0, // Would query database
        confirmed_today: 0, // Would query database
        total_revenue_today: 0 // Would query database
      },
      system: {
        uptime: process.uptime(),
        memory_usage: process.memoryUsage(),
        redis_memory: redisMemory,
        node_version: process.version
      },
      security: {
        suspicious_activities: suspiciousActivities.length,
        blocked_ips: 0 // Would implement IP blocking
      }
    };
    
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get system stats', error);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function getSuspiciousActivities(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const activities = await fraudService.getSuspiciousActivities(limit);
    
    res.json({
      activities,
      total: activities.length
    });
  } catch (error) {
    logger.error('Failed to get suspicious activities', error);
    res.status(500).json({ error: 'Internal error' });
  }
}