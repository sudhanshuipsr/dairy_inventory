import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Default accounts fallback metadata if DB record is not accessible during migration
const DEFAULT_ROLES = {
  1: { id: 1, _id: 1, name: 'Mother Dairy Admin', email: 'admin@dairy.com', role: 'admin', isActive: true },
  2: { id: 2, _id: 2, name: 'Store Staff Counter', email: 'staff@dairy.com', role: 'staff', isActive: true }
};

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }

  // Handle mock tokens for testing/offline scenarios if explicitly passed
  if (token === 'demo-admin-jwt-token-2026') {
    req.user = DEFAULT_ROLES[1];
    return next();
  }
  if (token === 'demo-staff-jwt-token-2026') {
    req.user = DEFAULT_ROLES[2];
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dairy-inventory-super-secret-jwt-key-2026');
    let user = null;

    try {
      user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      });
    } catch (e) {
      console.warn('[Auth Middleware DB Lookup Warning]:', e.message);
    }

    if (!user && DEFAULT_ROLES[decoded.id]) {
      user = DEFAULT_ROLES[decoded.id];
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'User belonging to this token no longer exists' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact administrator.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid or expired' });
  }
};

// Admin-only access restriction middleware
export const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied: Admin privileges required' });
};

// Staff or Admin access
export const requireStaff = (req, res, next) => {
  if (req.user && (req.user.role === 'staff' || req.user.role === 'admin')) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied: Staff or Admin role required' });
};

export default protect;

