import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

// Ensure IPv4 first on dual-stack environments (prevents AWS ETIMEDOUT on Windows / Cloud)
if (dns && typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

import { connectDB, sequelize, activeDatabaseType } from './config/database.js';
import { User, Product, Stock, Purchase, Sale } from './models/index.js';
import { initializeDefaultUsers, seedDatabase, clearAllDemoData } from './utils/seedData.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import productRoutes from './routes/productRoutes.js';
import stockRoutes from './routes/stockRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import saleRoutes from './routes/saleRoutes.js';
import productionRoutes from './routes/productionRoutes.js';
import expiryRoutes from './routes/expiryRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Lazy DB initialization promise for serverless environments (e.g. Vercel)
let dbInitPromise = null;
export const ensureDbConnected = async () => {
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      await connectDB();
      await sequelize.sync();
      try {
        await sequelize.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);");
      } catch (e) {}
      await initializeDefaultUsers();
      console.log(`[Database] Connected and synced successfully (${activeDatabaseType.toUpperCase()})`);
    })().catch(err => {
      console.error('[Database Init Error]:', err.message);
      dbInitPromise = null;
      throw err;
    });
  }
  return dbInitPromise;
};

// Middleware: Auto ensure DB is ready on every API request
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api') && req.path !== '/api/health') {
    try {
      await ensureDbConnected();
    } catch (err) {
      console.warn('[DB Connect Middleware Warning]:', err.message);
    }
  }
  next();
});

// Health Check API
app.get('/api/health', async (req, res) => {
  let productCount = 0;
  let dbStatus = activeDatabaseType.toUpperCase();
  try {
    if (sequelize) {
      productCount = await Product.count();
      dbStatus = `${activeDatabaseType.toUpperCase()} (Connected)`;
    }
  } catch (e) {
    dbStatus = `${activeDatabaseType.toUpperCase()} (Connecting...)`;
  }

  res.status(200).json({
    status: 'online',
    database: dbStatus,
    productsCount: productCount,
    service: 'Mother Dairy Real-Time PostgreSQL ERP Engine',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/expiry', expiryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/feedback', feedbackRoutes);

// Admin Re-seed & Demo Endpoints
app.post('/api/admin/seed-demo', async (req, res) => {
  try {
    const result = await seedDatabase();
    res.status(200).json({ success: true, message: 'Successfully seeded demo products and initial stock!', count: result?.count || 27 });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/admin/clear-demo', async (req, res) => {
  try {
    const result = await clearAllDemoData();
    res.status(200).json({ success: true, message: 'All demo products, stock, and transactions removed successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

export default app;
