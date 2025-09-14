import { Router } from 'express';
import { initiatePayment, getPaymentStatus, mpesaWebhook, reconcilePayment } from '../controllers/paymentController.js';
import { validatePaymentInitiation } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';
const router = Router();
router.post('/initiate', validatePaymentInitiation, initiatePayment);
router.get('/:reference/status', getPaymentStatus);
router.post('/webhook', mpesaWebhook);
router.post('/:reference/reconcile', authenticateToken, reconcilePayment);
export default router;
//# sourceMappingURL=payment.js.map