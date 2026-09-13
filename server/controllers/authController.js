import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { logAudit } from '../middleware/auditLogger.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'dairy-inventory-super-secret-jwt-key-2026', {
    expiresIn: '30d'
  });
};

// Default hardcoded admin and staff for zero-downtime serverless authentication
const DEFAULT_ACCOUNTS = {
  'admin@dairy.com': {
    id: 1,
    _id: 1,
    name: 'Mother Dairy Admin',
    email: 'admin@dairy.com',
    passwordHash: 'admin123',
    role: 'admin',
    phone: '+91 98100 00001',
    isActive: true
  },
  'staff@dairy.com': {
    id: 2,
    _id: 2,
    name: 'Store Staff Counter',
    email: 'staff@dairy.com',
    passwordHash: 'staff123',
    role: 'staff',
    phone: '+91 98100 00002',
    isActive: true
  }
};

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password' });
    }

    const cleanEmail = email.toLowerCase().trim();

    let user = null;
    let isMatch = false;

    try {
      user = await User.findOne({ where: { email: cleanEmail } });
      if (user) {
        if (!user.isActive) {
          return res.status(403).json({ success: false, message: 'Account is deactivated. Contact the Admin.' });
        }
        isMatch = await user.comparePassword(password);
      }
    } catch (dbErr) {
      console.warn('[Login DB Query Warning]:', dbErr.message);
    }

    // Default account fallback if DB sync is in progress or user not yet created
    if (!user && DEFAULT_ACCOUNTS[cleanEmail]) {
      const defaultAcc = DEFAULT_ACCOUNTS[cleanEmail];
      if (password === defaultAcc.passwordHash) {
        user = defaultAcc;
        isMatch = true;
      }
    }

    if (!user || !isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken(user.id);

    req.user = user;
    try {
      await logAudit({
        req,
        action: 'LOGIN',
        entityType: 'Auth',
        entityId: user.id,
        details: `User ${user.name} (${user.role}) logged in successfully`
      });
    } catch (e) {}

    res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: {
        _id: user.id,
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// @route   POST /api/auth/register-staff
// @desc    Admin-only staff account creation (no public registration)
// @access  Private/Admin
export const registerStaff = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role === 'admin' ? 'admin' : 'staff',
      phone: phone || ''
    });

    await logAudit({
      req,
      action: 'CREATE',
      entityType: 'User',
      entityId: newUser.id,
      details: `Created new ${newUser.role} account for ${newUser.name} (${newUser.email})`
    });

    res.status(201).json({
      success: true,
      message: `User ${newUser.name} created successfully as ${newUser.role}.`,
      user: {
        _id: newUser.id,
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/auth/me
// @desc    Get currently logged-in user profile
// @access  Private
export const getMe = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const userJson = user.toJSON();
    userJson._id = userJson.id;
    res.status(200).json({ success: true, user: userJson });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   PUT /api/auth/profile
// @desc    Update own profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { name, phone, password } = req.body;
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();

    await logAudit({
      req,
      action: 'UPDATE',
      entityType: 'User',
      entityId: user.id,
      details: `User updated profile information`
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: user.id,
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
