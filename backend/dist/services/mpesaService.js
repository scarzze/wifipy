import fetch from 'node-fetch';
import { createHmac } from 'crypto';
import { logger } from '../utils/logger.js';
export class MpesaService {
    accessToken = null;
    tokenExpiry = 0;
    get baseUrl() {
        return process.env.MPESA_ENVIRONMENT === 'production'
            ? 'https://api.safaricom.co.ke'
            : 'https://sandbox.safaricom.co.ke';
    }
    async getAccessToken() {
        if (this.accessToken && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }
        const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
        try {
            const response = await fetch(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (data.access_token) {
                this.accessToken = data.access_token;
                this.tokenExpiry = Date.now() + (parseInt(data.expires_in) - 60) * 1000;
                return this.accessToken;
            }
            throw new Error('Failed to get access token');
        }
        catch (error) {
            logger.error('M-Pesa token generation failed', error);
            throw error;
        }
    }
    async initiateSTKPush(phoneNumber, amount, reference) {
        try {
            const token = await this.getAccessToken();
            const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
            const shortcode = process.env.MPESA_SHORTCODE;
            const passkey = process.env.MPESA_PASSKEY;
            const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
            const payload = {
                BusinessShortCode: shortcode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: 'CustomerPayBillOnline',
                Amount: amount,
                PartyA: phoneNumber,
                PartyB: shortcode,
                PhoneNumber: phoneNumber,
                CallBackURL: process.env.MPESA_CALLBACK_URL,
                AccountReference: reference,
                TransactionDesc: `Internet Access - ${reference}`
            };
            const response = await fetch(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            logger.info('STK Push initiated', { reference, phoneNumber, result });
            return result;
        }
        catch (error) {
            logger.error('STK Push failed', { reference, phoneNumber, error });
            throw error;
        }
    }
    async verifyWebhookSignature(req) {
        try {
            const signature = req.headers['x-mpesa-signature'];
            if (!signature)
                return true;
            const secret = process.env.WEBHOOK_SECRET;
            if (!secret)
                return true;
            const payload = JSON.stringify(req.body);
            const expectedSignature = createHmac('sha256', secret)
                .update(payload)
                .digest('hex');
            return signature === expectedSignature;
        }
        catch (error) {
            logger.error('Webhook signature verification failed', error);
            return false;
        }
    }
    async verifyTransaction(transactionId) {
        try {
            const token = await this.getAccessToken();
            const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
            const shortcode = process.env.MPESA_SHORTCODE;
            const passkey = process.env.MPESA_PASSKEY;
            const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
            const payload = {
                BusinessShortCode: shortcode,
                Password: password,
                Timestamp: timestamp,
                TransactionID: transactionId
            };
            const response = await fetch(`${this.baseUrl}/mpesa/transactionstatus/v1/query`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            return {
                success: result.ResultCode === '0',
                data: result
            };
        }
        catch (error) {
            logger.error('Transaction verification failed', { transactionId, error });
            return { success: false };
        }
    }
}
//# sourceMappingURL=mpesaService.js.map