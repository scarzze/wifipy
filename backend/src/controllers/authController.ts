import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger.js';

// Simple in-memory admin user (replace with database in production)
const ADMIN_USER = {
  username: 'admin',
  passwordHash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
  role: 'admin'
};

export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    if (username !== ADMIN_USER.username) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValid = await bcrypt.compare(password, ADMIN_USER.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { username, role: ADMIN_USER.role },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
    
    const refreshToken = jwt.sign(
      { username, type: 'refresh' },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    
    logger.info('Admin login successful', { username, ip: req.ip });
    
    res.json({
      token,
      refreshToken,
      user: { username, role: ADMIN_USER.role }
    });
    
  } catch (error) {
    logger.error('Login failed', error);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function refreshToken(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }
    
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as any;
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    const newToken = jwt.sign(
      { username: decoded.username, role: ADMIN_USER.role },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
    
    res.json({ token: newToken });
    
  } catch (error) {
    logger.error('Token refresh failed', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
}

export async function logout(req: Request, res: Response) {
  // In a real implementation, you'd blacklist the token
  logger.info('Admin logout', { username: (req as any).user?.username });
  res.json({ message: 'Logged out successfully' });
}