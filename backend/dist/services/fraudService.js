import { redisClient } from './redisService.js';
import { logger } from '../utils/logger.js';
export class FraudService {
    FRAUD_PREFIX = 'fraud:';
    IP_ATTEMPTS_PREFIX = 'ip_attempts:';
    MAC_ATTEMPTS_PREFIX = 'mac_attempts:';
    async checkPaymentRequest(request) {
        try {
            let riskScore = 0;
            const checks = [];
            if (request.ip) {
                const ipAttempts = await this.getAttempts(this.IP_ATTEMPTS_PREFIX, request.ip);
                if (ipAttempts >= 10) {
                    return { allowed: false, reason: 'ip_rate_limit', riskScore: 100 };
                }
                riskScore += ipAttempts * 5;
                checks.push(`ip_attempts:${ipAttempts}`);
            }
            if (request.mac) {
                const macAttempts = await this.getAttempts(this.MAC_ATTEMPTS_PREFIX, request.mac);
                if (macAttempts >= 5) {
                    return { allowed: false, reason: 'mac_rate_limit', riskScore: 100 };
                }
                riskScore += macAttempts * 10;
                checks.push(`mac_attempts:${macAttempts}`);
            }
            if (request.amount < 1 || request.amount > 1000) {
                riskScore += 30;
                checks.push('suspicious_amount');
            }
            const rapidRequests = await this.checkRapidRequests(request.ip || request.mac);
            if (rapidRequests) {
                riskScore += 40;
                checks.push('rapid_requests');
            }
            if (request.deviceInfo) {
                const deviceRisk = await this.checkDeviceFingerprint(request.deviceInfo);
                riskScore += deviceRisk;
                if (deviceRisk > 0)
                    checks.push(`device_risk:${deviceRisk}`);
            }
            const allowed = riskScore < 70;
            if (allowed) {
                await this.recordAttempt(request);
            }
            logger.info('Fraud check completed', {
                ip: request.ip,
                mac: request.mac,
                riskScore,
                allowed,
                checks
            });
            return {
                allowed,
                reason: allowed ? undefined : 'high_risk_score',
                riskScore
            };
        }
        catch (error) {
            logger.error('Fraud check failed', error);
            return { allowed: true, riskScore: 0 };
        }
    }
    async getAttempts(prefix, identifier) {
        try {
            const key = `${prefix}${identifier}`;
            const attempts = await redisClient.get(key);
            return attempts ? parseInt(attempts) : 0;
        }
        catch (error) {
            return 0;
        }
    }
    async recordAttempt(request) {
        const ttl = 3600;
        if (request.ip) {
            const ipKey = `${this.IP_ATTEMPTS_PREFIX}${request.ip}`;
            await redisClient.multi()
                .incr(ipKey)
                .expire(ipKey, ttl)
                .exec();
        }
        if (request.mac) {
            const macKey = `${this.MAC_ATTEMPTS_PREFIX}${request.mac}`;
            await redisClient.multi()
                .incr(macKey)
                .expire(macKey, ttl)
                .exec();
        }
    }
    async checkRapidRequests(identifier) {
        if (!identifier)
            return false;
        try {
            const key = `rapid:${identifier}`;
            const lastRequest = await redisClient.get(key);
            if (lastRequest) {
                const timeDiff = Date.now() - parseInt(lastRequest);
                if (timeDiff < 5000) {
                    return true;
                }
            }
            await redisClient.setex(key, 10, Date.now().toString());
            return false;
        }
        catch (error) {
            return false;
        }
    }
    async checkDeviceFingerprint(deviceInfo) {
        let risk = 0;
        if (deviceInfo.userAgent) {
            const suspiciousAgents = ['bot', 'crawler', 'spider', 'headless'];
            if (suspiciousAgents.some(agent => deviceInfo.userAgent.toLowerCase().includes(agent))) {
                risk += 50;
            }
        }
        if (!deviceInfo.screen || !deviceInfo.timezone) {
            risk += 20;
        }
        if (deviceInfo.screen) {
            const { width, height } = deviceInfo.screen;
            if (width < 100 || height < 100 || width > 5000 || height > 5000) {
                risk += 30;
            }
        }
        return Math.min(risk, 100);
    }
    async reportSuspiciousActivity(data) {
        try {
            const key = `${this.FRAUD_PREFIX}suspicious:${Date.now()}`;
            await redisClient.setex(key, 86400, JSON.stringify({
                ...data,
                timestamp: Date.now()
            }));
            logger.warn('Suspicious activity reported', data);
        }
        catch (error) {
            logger.error('Failed to report suspicious activity', error);
        }
    }
    async getSuspiciousActivities(limit = 100) {
        try {
            const keys = await redisClient.keys(`${this.FRAUD_PREFIX}suspicious:*`);
            const activities = [];
            for (const key of keys.slice(0, limit)) {
                const data = await redisClient.get(key);
                if (data) {
                    activities.push(JSON.parse(data));
                }
            }
            return activities.sort((a, b) => b.timestamp - a.timestamp);
        }
        catch (error) {
            logger.error('Failed to get suspicious activities', error);
            return [];
        }
    }
}
//# sourceMappingURL=fraudService.js.map