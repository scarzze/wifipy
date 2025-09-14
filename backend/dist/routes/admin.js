import { Router } from 'express';
import { getPayments, getSessions, revokeSession, getSystemStats, getSuspiciousActivities } from '../controllers/adminController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
const router = Router();
router.use(authenticateToken);
router.use(requireAdmin);
router.get('/payments', getPayments);
router.get('/sessions', getSessions);
router.delete('/sessions/:reference', revokeSession);
router.get('/stats', getSystemStats);
router.get('/suspicious', getSuspiciousActivities);
export default router;
//# sourceMappingURL=admin.js.map