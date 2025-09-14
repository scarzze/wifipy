import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';
export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        logger.warn('Invalid token attempt', { ip: req.ip, token: token.substring(0, 10) });
        res.status(403).json({ error: 'Invalid or expired token' });
    }
}
export function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        logger.warn('Unauthorized admin access attempt', {
            ip: req.ip,
            user: req.user?.username
        });
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}
//# sourceMappingURL=auth.js.map