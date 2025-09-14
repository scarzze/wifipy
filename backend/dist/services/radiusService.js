import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger.js';
import { redisClient } from './redisService.js';
const execAsync = promisify(exec);
export class RadiusService {
    RADIUS_PREFIX = 'radius:';
    async grantAccess(grant) {
        try {
            const key = `${this.RADIUS_PREFIX}${grant.reference}`;
            await redisClient.setex(key, grant.ttl, JSON.stringify(grant));
            if (process.env.COOVA_CHILLI_ENABLED === 'true') {
                await this.grantCoovaChilliAccess(grant);
            }
            if (process.env.FREERADIUS_ENABLED === 'true') {
                await this.grantFreeRadiusAccess(grant);
            }
            if (process.env.IPTABLES_ENABLED === 'true') {
                await this.grantIptablesAccess(grant);
            }
            logger.info('Network access granted', grant);
        }
        catch (error) {
            logger.error('Failed to grant network access', { grant, error });
            throw error;
        }
    }
    async grantCoovaChilliAccess(grant) {
        try {
            const identifier = grant.mac || grant.ip;
            if (!identifier)
                return;
            const command = `echo "${identifier} Auth-Type := Accept, Session-Timeout := ${grant.ttl}" >> /etc/chilli/localusers`;
            await execAsync(command);
            await execAsync('killall -HUP chilli');
            logger.info('CoovaChilli access granted', { identifier, ttl: grant.ttl });
        }
        catch (error) {
            logger.error('CoovaChilli access grant failed', error);
        }
    }
    async grantFreeRadiusAccess(grant) {
        try {
            const identifier = grant.mac || grant.ip;
            if (!identifier)
                return;
            const query = `
        INSERT INTO radreply (username, attribute, op, value) 
        VALUES ('${identifier}', 'Auth-Type', ':=', 'Accept'),
               ('${identifier}', 'Session-Timeout', ':=', '${grant.ttl}')
        ON DUPLICATE KEY UPDATE value = VALUES(value);
      `;
            const command = `mysql -u radius -p${process.env.RADIUS_DB_PASSWORD} radius -e "${query}"`;
            await execAsync(command);
            logger.info('FreeRADIUS access granted', { identifier, ttl: grant.ttl });
        }
        catch (error) {
            logger.error('FreeRADIUS access grant failed', error);
        }
    }
    async grantIptablesAccess(grant) {
        try {
            const identifier = grant.mac || grant.ip;
            if (!identifier)
                return;
            let rule;
            if (grant.mac) {
                rule = `iptables -I FORWARD -m mac --mac-source ${grant.mac} -j ACCEPT`;
            }
            else if (grant.ip) {
                rule = `iptables -I FORWARD -s ${grant.ip} -j ACCEPT`;
            }
            else {
                return;
            }
            await execAsync(rule);
            setTimeout(async () => {
                try {
                    const removeRule = rule.replace('-I', '-D');
                    await execAsync(removeRule);
                    logger.info('iptables rule removed after TTL', { identifier });
                }
                catch (error) {
                    logger.error('Failed to remove iptables rule', error);
                }
            }, grant.ttl * 1000);
            logger.info('iptables access granted', { identifier, ttl: grant.ttl });
        }
        catch (error) {
            logger.error('iptables access grant failed', error);
        }
    }
    async revokeAccess(reference) {
        try {
            const key = `${this.RADIUS_PREFIX}${reference}`;
            const grantData = await redisClient.get(key);
            if (!grantData)
                return;
            const grant = JSON.parse(grantData);
            const identifier = grant.mac || grant.ip;
            if (!identifier)
                return;
            if (process.env.COOVA_CHILLI_ENABLED === 'true') {
                await execAsync(`sed -i '/${identifier}/d' /etc/chilli/localusers`);
                await execAsync('killall -HUP chilli');
            }
            if (grant.mac && process.env.IPTABLES_ENABLED === 'true') {
                await execAsync(`iptables -D FORWARD -m mac --mac-source ${grant.mac} -j ACCEPT`);
            }
            else if (grant.ip && process.env.IPTABLES_ENABLED === 'true') {
                await execAsync(`iptables -D FORWARD -s ${grant.ip} -j ACCEPT`);
            }
            await redisClient.del(key);
            logger.info('Network access revoked', { reference, identifier });
        }
        catch (error) {
            logger.error('Failed to revoke network access', { reference, error });
        }
    }
    async listActiveGrants() {
        try {
            const keys = await redisClient.keys(`${this.RADIUS_PREFIX}*`);
            const grants = [];
            for (const key of keys) {
                const data = await redisClient.get(key);
                if (data) {
                    grants.push(JSON.parse(data));
                }
            }
            return grants;
        }
        catch (error) {
            logger.error('Failed to list active grants', error);
            return [];
        }
    }
}
//# sourceMappingURL=radiusService.js.map