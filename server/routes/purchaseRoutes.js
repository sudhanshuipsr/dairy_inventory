import express from 'express';
import { getPurchases, getPurchaseById, createPurchase, deletePurchase } from '../controllers/purchaseController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getPurchases);
router.get('/:id', getPurchaseById);
router.post('/', createPurchase); // Staff and Admin can record purchases
router.delete('/:id', requireAdmin, deletePurchase); // Only Admin can delete/reverse

export default router;
