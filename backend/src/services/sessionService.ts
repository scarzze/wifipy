import { redisClient } from './redisService.js';
import { logger } from '../utils/logger.js';

export interface Session {
  reference: string;
  mac?: string;
  ip?: string;
  ttl: number;
  createdAt: number;
  lastSeen?: number;
}

export class SessionService {
  private readonly SESSION_PREFIX = 'session:';
  private readonly ACTIVE_PREFIX = 'active:';
  
  async createSession(data: Omit<Session, 'createdAt'>): Promise<Session> {
    const session: Session = {
      ...data,
      createdAt: Date.now()
    };
    
    const sessionKey = `${this.SESSION_PREFIX}${session.reference}`;
    const activeKey = `${this.ACTIVE_PREFIX}${session.mac || session.ip}`;
    
    await Promise.all([
      redisClient.setex(sessionKey, session.ttl, JSON.stringify(session)),
      redisClient.setex(activeKey, session.ttl, session.reference)
    ]);
    
    logger.info('Session created', { reference: session.reference, ttl: session.ttl });
    return session;
  }
  
  async getSession(reference: string): Promise<Session | null> {
    try {
      const key = `${this.SESSION_PREFIX}${reference}`;
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get session', { reference, error });
      return null;
    }
  }
  
  async updateLastSeen(reference: string): Promise<void> {
    try {
      const session = await this.getSession(reference);
      if (!session) return;
      
      session.lastSeen = Date.now();
      const key = `${this.SESSION_PREFIX}${reference}`;
      const ttl = await redisClient.ttl(key);
      
      if (ttl > 0) {
        await redisClient.setex(key, ttl, JSON.stringify(session));
      }
    } catch (error) {
      logger.error('Failed to update last seen', { reference, error });
    }
  }
  
  async extendSession(reference: string, additionalTtl: number): Promise<boolean> {
    try {
      const session = await this.getSession(reference);
      if (!session) return false;
      
      const sessionKey = `${this.SESSION_PREFIX}${reference}`;
      const activeKey = `${this.ACTIVE_PREFIX}${session.mac || session.ip}`;
      
      await Promise.all([
        redisClient.expire(sessionKey, additionalTtl),
        redisClient.expire(activeKey, additionalTtl)
      ]);
      
      logger.info('Session extended', { reference, additionalTtl });
      return true;
    } catch (error) {
      logger.error('Failed to extend session', { reference, error });
      return false;
    }
  }
  
  async revokeSession(reference: string): Promise<void> {
    try {
      const session = await this.getSession(reference);
      if (!session) return;
      
      const sessionKey = `${this.SESSION_PREFIX}${reference}`;
      const activeKey = `${this.ACTIVE_PREFIX}${session.mac || session.ip}`;
      
      await Promise.all([
        redisClient.del(sessionKey),
        redisClient.del(activeKey)
      ]);
      
      logger.info('Session revoked', { reference });
    } catch (error) {
      logger.error('Failed to revoke session', { reference, error });
    }
  }
  
  async getActiveSessions(): Promise<Session[]> {
    try {
      const keys = await redisClient.keys(`${this.SESSION_PREFIX}*`);
      const sessions: Session[] = [];
      
      for (const key of keys) {
        const data = await redisClient.get(key);
        if (data) {
          sessions.push(JSON.parse(data));
        }
      }
      
      return sessions.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      logger.error('Failed to get active sessions', error);
      return [];
    }
  }
  
  async isDeviceActive(mac?: string, ip?: string): Promise<boolean> {
    if (!mac && !ip) return false;
    
    try {
      const key = `${this.ACTIVE_PREFIX}${mac || ip}`;
      const reference = await redisClient.get(key);
      return !!reference;
    } catch (error) {
      logger.error('Failed to check device activity', { mac, ip, error });
      return false;
    }
  }
}