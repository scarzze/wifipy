import { Router } from 'express';
import { login, refreshToken, logout } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
const router = Router();
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', authenticateToken, logout);
export default router;
//# sourceMappingURL=auth.js.map