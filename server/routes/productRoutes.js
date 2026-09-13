import express from 'express';
import {
  getProducts,
  getProductById,
  getProductByCode,
  getProductByBarcode,
  lookupBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
  generateQrCodeImage
} from '../controllers/productController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getProducts);
router.get('/barcode/:code', getProductByBarcode);
router.get('/lookup-barcode/:barcode', lookupBarcode);
router.get('/code/:code', getProductByCode);
router.get('/:id', getProductById);
router.get('/:id/qr', generateQrCodeImage);


// Admin-only mutations
router.post('/', requireAdmin, createProduct);
router.put('/:id', requireAdmin, updateProduct);
router.delete('/:id', requireAdmin, deleteProduct);

export default router;
