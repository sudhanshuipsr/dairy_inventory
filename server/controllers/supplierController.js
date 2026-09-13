import { Op } from 'sequelize';
import Supplier from '../models/Supplier.js';
import { logAudit } from '../middleware/auditLogger.js';

// @route   GET /api/suppliers
// @desc    Get all suppliers (searchable, filterable)
// @access  Private (Admin & Staff)
export const getSuppliers = async (req, res) => {
  try {
    const { search, category, activeOnly } = req.query;
    const where = {};

    if (activeOnly === 'true') {
      where.isActive = true;
    }

    if (category && category !== 'All' && category !== 'all') {
      where.category = category;
    }

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      where[Op.or] = [
        { name: { [Op.like]: s } },
        { contactPerson: { [Op.like]: s } },
        { phone: { [Op.like]: s } },
        { email: { [Op.like]: s } },
        { gstNumber: { [Op.like]: s } }
      ];
    }

    const suppliers = await Supplier.findAll({
      where,
      order: [['name', 'ASC']]
    });

    const formatted = suppliers.map((s) => {
      const j = s.toJSON();
      j._id = j.id;
      return j;
    });

    res.status(200).json({
      success: true,
      count: formatted.length,
      suppliers: formatted
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/suppliers/:id
// @desc    Get single supplier details
// @access  Private (Admin & Staff)
export const getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const j = supplier.toJSON();
    j._id = j.id;

    res.status(200).json({ success: true, supplier: j });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   POST /api/suppliers
// @desc    Create new supplier
// @access  Private/Admin
export const createSupplier = async (req, res) => {
  try {
    const { name, contactPerson, phone, email, address, gstNumber, category, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Supplier name is required' });
    }

    const supplier = await Supplier.create({
      name: name.trim(),
      contactPerson: contactPerson || '',
      phone: phone || '',
      email: email ? email.toLowerCase().trim() : '',
      address: address || '',
      gstNumber: gstNumber ? gstNumber.trim() : '',
      category: category || 'raw-milk',
      notes: notes || '',
      isActive: true
    });

    await logAudit({
      req,
      action: 'CREATE',
      entityType: 'Supplier',
      entityId: supplier.id,
      details: `Created supplier "${supplier.name}" (${supplier.category})`
    });

    const j = supplier.toJSON();
    j._id = j.id;

    res.status(201).json({
      success: true,
      message: `Supplier "${supplier.name}" created successfully`,
      supplier: j
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   PUT /api/suppliers/:id
// @desc    Update supplier details
// @access  Private/Admin
export const updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const { name, contactPerson, phone, email, address, gstNumber, category, notes, isActive } = req.body;

    if (name) supplier.name = name.trim();
    if (contactPerson !== undefined) supplier.contactPerson = contactPerson;
    if (phone !== undefined) supplier.phone = phone;
    if (email !== undefined) supplier.email = email ? email.toLowerCase().trim() : '';
    if (address !== undefined) supplier.address = address;
    if (gstNumber !== undefined) supplier.gstNumber = gstNumber.trim();
    if (category !== undefined) supplier.category = category;
    if (notes !== undefined) supplier.notes = notes;
    if (isActive !== undefined) supplier.isActive = isActive;

    await supplier.save();

    await logAudit({
      req,
      action: 'UPDATE',
      entityType: 'Supplier',
      entityId: supplier.id,
      details: `Updated supplier "${supplier.name}" details`
    });

    const j = supplier.toJSON();
    j._id = j.id;

    res.status(200).json({
      success: true,
      message: `Supplier "${supplier.name}" updated successfully`,
      supplier: j
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   DELETE /api/suppliers/:id
// @desc    Delete supplier
// @access  Private/Admin
export const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const suppName = supplier.name;
    await supplier.destroy();

    await logAudit({
      req,
      action: 'DELETE',
      entityType: 'Supplier',
      entityId: req.params.id,
      details: `Admin deleted supplier "${suppName}"`
    });

    res.status(200).json({
      success: true,
      message: `Supplier "${suppName}" deleted successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
