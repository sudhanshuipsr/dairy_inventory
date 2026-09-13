import express from 'express';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier
} from '../controllers/supplierController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// View routes (Staff & Admin)
router.get('/', getSuppliers);
router.get('/:id', getSupplierById);

// Mutation routes (Admin only)
router.post('/', requireAdmin, createSupplier);
router.put('/:id', requireAdmin, updateSupplier);
router.delete('/:id', requireAdmin, deleteSupplier);

export default router;
