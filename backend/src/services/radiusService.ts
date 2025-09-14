import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger.js';
import { redisClient } from './redisService.js';

const execAsync = promisify(exec);

export interface AccessGrant {
  mac?: string;
  ip?: string;
  ttl: number;
  reference: string;
}

export class RadiusService {
  private readonly RADIUS_PREFIX = 'radius:';
  
  async grantAccess(grant: AccessGrant): Promise<void> {
    try {
      // Store in Redis for tracking
      const key = `${this.RADIUS_PREFIX}${grant.reference}`;
      await redisClient.setex(key, grant.ttl, JSON.stringify(grant));
      
      // Method 1: CoovaChilli integration
      if (process.env.COOVA_CHILLI_ENABLED === 'true') {
        await this.grantCoovaChilliAccess(grant);
      }
      
      // Method 2: FreeRADIUS integration
      if (process.env.FREERADIUS_ENABLED === 'true') {
        await this.grantFreeRadiusAccess(grant);
      }
      
      // Method 3: Direct iptables rules (fallback)
      if (process.env.IPTABLES_ENABLED === 'true') {
        await this.grantIptablesAccess(grant);
      }
      
      logger.info('Network access granted', grant);
    } catch (error) {
      logger.error('Failed to grant network access', { grant, error });
      throw error;
    }
  }
  
  private async grantCoovaChilliAccess(grant: AccessGrant): Promise<void> {
    try {
      const identifier = grant.mac || grant.ip;
      if (!identifier) return;
      
      // Add to CoovaChilli authorized users
      const command = `echo "${identifier} Auth-Type := Accept, Session-Timeout := ${grant.ttl}" >> /etc/chilli/localusers`;
      await execAsync(command);
      
      // Reload CoovaChilli configuration
      await execAsync('killall -HUP chilli');
      
      logger.info('CoovaChilli access granted', { identifier, ttl: grant.ttl });
    } catch (error) {
      logger.error('CoovaChilli access grant failed', error);
    }
  }
  
  private async grantFreeRadiusAccess(grant: AccessGrant): Promise<void> {
    try {
      const identifier = grant.mac || grant.ip;
      if (!identifier) return;
      
      // Insert into radreply table (assuming MySQL/PostgreSQL backend)
      const query = `
        INSERT INTO radreply (username, attribute, op, value) 
        VALUES ('${identifier}', 'Auth-Type', ':=', 'Accept'),
               ('${identifier}', 'Session-Timeout', ':=', '${grant.ttl}')
        ON DUPLICATE KEY UPDATE value = VALUES(value);
      `;
      
      // Execute via radclient or direct DB connection
      const command = `mysql -u radius -p${process.env.RADIUS_DB_PASSWORD} radius -e "${query}"`;
      await execAsync(command);
      
      logger.info('FreeRADIUS access granted', { identifier, ttl: grant.ttl });
    } catch (error) {
      logger.error('FreeRADIUS access grant failed', error);
    }
  }
  
  private async grantIptablesAccess(grant: AccessGrant): Promise<void> {
    try {
      const identifier = grant.mac || grant.ip;
      if (!identifier) return;
      
      let rule: string;
      if (grant.mac) {
        rule = `iptables -I FORWARD -m mac --mac-source ${grant.mac} -j ACCEPT`;
      } else if (grant.ip) {
        rule = `iptables -I FORWARD -s ${grant.ip} -j ACCEPT`;
      } else {
        return;
      }
      
      await execAsync(rule);
      
      // Schedule removal after TTL
      setTimeout(async () => {
        try {
          const removeRule = rule.replace('-I', '-D');
          await execAsync(removeRule);
          logger.info('iptables rule removed after TTL', { identifier });
        } catch (error) {
          logger.error('Failed to remove iptables rule', error);
        }
      }, grant.ttl * 1000);
      
      logger.info('iptables access granted', { identifier, ttl: grant.ttl });
    } catch (error) {
      logger.error('iptables access grant failed', error);
    }
  }
  
  async revokeAccess(reference: string): Promise<void> {
    try {
      const key = `${this.RADIUS_PREFIX}${reference}`;
      const grantData = await redisClient.get(key);
      
      if (!grantData) return;
      
      const grant: AccessGrant = JSON.parse(grantData);
      const identifier = grant.mac || grant.ip;
      
      if (!identifier) return;
      
      // Remove from various systems
      if (process.env.COOVA_CHILLI_ENABLED === 'true') {
        await execAsync(`sed -i '/${identifier}/d' /etc/chilli/localusers`);
        await execAsync('killall -HUP chilli');
      }
      
      if (grant.mac && process.env.IPTABLES_ENABLED === 'true') {
        await execAsync(`iptables -D FORWARD -m mac --mac-source ${grant.mac} -j ACCEPT`);
      } else if (grant.ip && process.env.IPTABLES_ENABLED === 'true') {
        await execAsync(`iptables -D FORWARD -s ${grant.ip} -j ACCEPT`);
      }
      
      await redisClient.del(key);
      logger.info('Network access revoked', { reference, identifier });
    } catch (error) {
      logger.error('Failed to revoke network access', { reference, error });
    }
  }
  
  async listActiveGrants(): Promise<AccessGrant[]> {
    try {
      const keys = await redisClient.keys(`${this.RADIUS_PREFIX}*`);
      const grants: AccessGrant[] = [];
      
      for (const key of keys) {
        const data = await redisClient.get(key);
        if (data) {
          grants.push(JSON.parse(data));
        }
      }
      
      return grants;
    } catch (error) {
      logger.error('Failed to list active grants', error);
      return [];
    }
  }
}