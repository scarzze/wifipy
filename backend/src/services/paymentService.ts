import { redisClient } from './redisService.js';
import { logger } from '../utils/logger.js';

export interface Payment {
  reference: string;
  amount: number;
  mac?: string;
  ip?: string;
  deviceInfo?: any;
  status: 'pending' | 'confirmed' | 'failed' | 'expired';
  providerTxnId?: string;
  phoneNumber?: string;
  createdAt: number;
  confirmedAt?: number;
}

export class PaymentService {
  private readonly PAYMENT_PREFIX = 'payment:';
  private readonly PENDING_PREFIX = 'pending:';
  
  async createPayment(data: Omit<Payment, 'createdAt'>): Promise<Payment> {
    const payment: Payment = {
      ...data,
      createdAt: Date.now()
    };
    
    const key = `${this.PAYMENT_PREFIX}${payment.reference}`;
    const pendingKey = `${this.PENDING_PREFIX}${payment.amount}:${payment.createdAt}`;
    
    await Promise.all([
      redisClient.setex(key, 3600, JSON.stringify(payment)), // 1 hour TTL
      redisClient.setex(pendingKey, 900, payment.reference) // 15 min TTL for pending lookup
    ]);
    
    return payment;
  }
  
  async findPaymentByReference(reference: string): Promise<Payment | null> {
    try {
      const key = `${this.PAYMENT_PREFIX}${reference}`;
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to find payment by reference', { reference, error });
      return null;
    }
  }
  
  async findRecentPendingPayment(amount: number): Promise<Payment | null> {
    try {
      // Look for pending payments with matching amount in last 15 minutes
      const now = Date.now();
      const keys = await redisClient.keys(`${this.PENDING_PREFIX}${amount}:*`);
      
      for (const key of keys) {
        const timestamp = parseInt(key.split(':')[2]);
        if (now - timestamp < 900000) { // 15 minutes
          const reference = await redisClient.get(key);
          if (reference) {
            const payment = await this.findPaymentByReference(reference);
            if (payment && payment.status === 'pending') {
              return payment;
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to find recent pending payment', { amount, error });
      return null;
    }
  }
  
  async updatePaymentStatus(reference: string, status: Payment['status']): Promise<void> {
    try {
      const payment = await this.findPaymentByReference(reference);
      if (!payment) return;
      
      payment.status = status;
      const key = `${this.PAYMENT_PREFIX}${reference}`;
      await redisClient.setex(key, 3600, JSON.stringify(payment));
    } catch (error) {
      logger.error('Failed to update payment status', { reference, status, error });
    }
  }
  
  async confirmPayment(reference: string, confirmationData: {
    providerTxnId?: string;
    phoneNumber?: string;
    confirmedAt: number;
  }): Promise<void> {
    try {
      const payment = await this.findPaymentByReference(reference);
      if (!payment) return;
      
      payment.status = 'confirmed';
      payment.providerTxnId = confirmationData.providerTxnId;
      payment.phoneNumber = confirmationData.phoneNumber;
      payment.confirmedAt = confirmationData.confirmedAt;
      
      const key = `${this.PAYMENT_PREFIX}${reference}`;
      await redisClient.setex(key, 86400, JSON.stringify(payment)); // 24 hours for confirmed payments
      
      // Remove from pending lookup
      const pendingKey = `${this.PENDING_PREFIX}${payment.amount}:${payment.createdAt}`;
      await redisClient.del(pendingKey);
      
    } catch (error) {
      logger.error('Failed to confirm payment', { reference, error });
    }
  }
}