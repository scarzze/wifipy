import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { PaymentService } from '../services/paymentService.js';
import { MpesaService } from '../services/mpesaService.js';
import { RadiusService } from '../services/radiusService.js';
import { SessionService } from '../services/sessionService.js';
import { FraudService } from '../services/fraudService.js';
const paymentService = new PaymentService();
const mpesaService = new MpesaService();
const radiusService = new RadiusService();
const sessionService = new SessionService();
const fraudService = new FraudService();
export async function initiatePayment(req, res) {
    try {
        const { mac, ip, amount = 20, deviceInfo } = req.body;
        const clientIp = req.ip || req.connection.remoteAddress;
        const fraudCheck = await fraudService.checkPaymentRequest({
            ip: clientIp,
            mac,
            amount,
            deviceInfo
        });
        if (!fraudCheck.allowed) {
            logger.warn('Payment blocked by fraud detection', { ip: clientIp, reason: fraudCheck.reason });
            return res.status(429).json({
                error: 'rate_limited',
                message: 'Too many payment attempts. Please try again later.'
            });
        }
        const reference = uuidv4().split('-')[0].toUpperCase();
        const till = process.env.MPESA_SHORTCODE || '123456';
        const payment = await paymentService.createPayment({
            reference,
            amount,
            mac,
            ip: ip || clientIp,
            deviceInfo,
            status: 'pending'
        });
        logger.info('Payment initiated', {
            reference,
            amount,
            mac,
            ip: payment.ip
        });
        res.json({
            reference,
            amount,
            till,
            instructions: `Send KES ${amount} to Till ${till} using reference ${reference}`,
            expiresIn: 900
        });
    }
    catch (error) {
        logger.error('Payment initiation failed', error);
        res.status(500).json({ error: 'internal_error' });
    }
}
export async function getPaymentStatus(req, res) {
    try {
        const { reference } = req.params;
        if (!reference || reference.length < 6) {
            return res.status(400).json({ error: 'invalid_reference' });
        }
        const payment = await paymentService.findPaymentByReference(reference);
        if (!payment) {
            return res.status(404).json({ error: 'payment_not_found' });
        }
        const now = Date.now();
        const expiryTime = payment.createdAt + (15 * 60 * 1000);
        if (now > expiryTime && payment.status === 'pending') {
            await paymentService.updatePaymentStatus(reference, 'expired');
            return res.json({ status: 'expired' });
        }
        res.json({
            status: payment.status,
            amount: payment.amount,
            createdAt: payment.createdAt,
            confirmedAt: payment.confirmedAt,
            expiresAt: expiryTime
        });
    }
    catch (error) {
        logger.error('Status check failed', error);
        res.status(500).json({ error: 'internal_error' });
    }
}
export async function mpesaWebhook(req, res) {
    try {
        logger.info('Webhook received', { body: req.body, headers: req.headers });
        const isValid = await mpesaService.verifyWebhookSignature(req);
        if (!isValid) {
            logger.warn('Invalid webhook signature', { ip: req.ip });
            return res.status(401).json({ error: 'invalid_signature' });
        }
        const { Body } = req.body;
        const callbackData = Body?.stkCallback || Body?.CallbackMetadata;
        if (!callbackData) {
            logger.warn('Invalid webhook format', { body: req.body });
            return res.status(400).json({ error: 'invalid_format' });
        }
        const { ResultCode, ResultDesc, CallbackMetadata } = callbackData;
        if (ResultCode !== 0) {
            logger.info('Payment failed from M-Pesa', { ResultCode, ResultDesc });
            return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
        }
        const metadata = CallbackMetadata?.Item || [];
        const amount = metadata.find((item) => item.Name === 'Amount')?.Value;
        const mpesaReceiptNumber = metadata.find((item) => item.Name === 'MpesaReceiptNumber')?.Value;
        const phoneNumber = metadata.find((item) => item.Name === 'PhoneNumber')?.Value;
        const payment = await paymentService.findRecentPendingPayment(amount);
        if (!payment) {
            logger.warn('No matching payment found', { amount, mpesaReceiptNumber });
            return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
        }
        await paymentService.confirmPayment(payment.reference, {
            providerTxnId: mpesaReceiptNumber,
            phoneNumber,
            confirmedAt: Date.now()
        });
        if (payment.mac || payment.ip) {
            const sessionTTL = parseInt(process.env.SESSION_TTL_MINUTES || '60') * 60;
            await Promise.all([
                radiusService.grantAccess({
                    mac: payment.mac,
                    ip: payment.ip,
                    ttl: sessionTTL,
                    reference: payment.reference
                }),
                sessionService.createSession({
                    reference: payment.reference,
                    mac: payment.mac,
                    ip: payment.ip,
                    ttl: sessionTTL
                })
            ]);
            logger.info('Network access granted', {
                reference: payment.reference,
                mac: payment.mac,
                ip: payment.ip,
                ttl: sessionTTL
            });
        }
        res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }
    catch (error) {
        logger.error('Webhook processing failed', error);
        res.status(500).json({ ResultCode: 1, ResultDesc: 'Internal Error' });
    }
}
export async function reconcilePayment(req, res) {
    try {
        const { reference } = req.params;
        const { providerTxnId } = req.body;
        const payment = await paymentService.findPaymentByReference(reference);
        if (!payment) {
            return res.status(404).json({ error: 'payment_not_found' });
        }
        if (payment.status === 'confirmed') {
            return res.json({ message: 'Payment already confirmed' });
        }
        const verification = await mpesaService.verifyTransaction(providerTxnId);
        if (!verification.success) {
            return res.status(400).json({ error: 'verification_failed' });
        }
        await paymentService.confirmPayment(reference, {
            providerTxnId,
            confirmedAt: Date.now()
        });
        logger.info('Payment manually reconciled', { reference, providerTxnId });
        res.json({ message: 'Payment reconciled successfully' });
    }
    catch (error) {
        logger.error('Manual reconciliation failed', error);
        res.status(500).json({ error: 'internal_error' });
    }
}
//# sourceMappingURL=paymentController.js.map