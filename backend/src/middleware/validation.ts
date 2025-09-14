import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger.js';

const paymentInitiationSchema = Joi.object({
  mac: Joi.string().pattern(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/).optional(),
  ip: Joi.string().ip().optional(),
  amount: Joi.number().min(1).max(1000).default(20),
  deviceInfo: Joi.object().optional()
});

export function validatePaymentInitiation(req: Request, res: Response, next: NextFunction) {
  const { error, value } = paymentInitiationSchema.validate(req.body);
  
  if (error) {
    logger.warn('Payment initiation validation failed', { 
      error: error.details[0].message,
      body: req.body,
      ip: req.ip 
    });
    return res.status(400).json({ 
      error: 'validation_error',
      message: error.details[0].message 
    });
  }
  
  req.body = value;
  next();
}