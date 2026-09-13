import QRCode from 'qrcode';
import { Op } from 'sequelize';
import { Product, Stock } from '../models/index.js';
import { logAudit } from '../middleware/auditLogger.js';

import { DEMO_PRODUCTS } from '../utils/seedData.js';

export const getProducts = async (req, res) => {
  try {
    const { category, search, activeOnly } = req.query;
    let productsWithStock = [];

    try {
      const where = {};
      if (category && category !== 'All' && category !== 'all') {
        where.category = category;
      }

      if (search && search.trim()) {
        const s = `%${search.trim()}%`;
        where[Op.or] = [
          { name: { [Op.like]: s } },
          { qrCode: { [Op.like]: s } },
          { barcode: { [Op.like]: s } },
          { category: { [Op.like]: s } }
        ];
      }

      if (activeOnly === 'true') {
        where.isActive = true;
      }

      const products = await Product.findAll({
        where,
        include: [{ model: Stock, as: 'stock' }],
        order: [['name', 'ASC']]
      });

      productsWithStock = products.map((p) => {
        const pJson = p.toJSON();
        const stock = pJson.stock;
        return {
          ...pJson,
          _id: pJson.id,
          currentQuantity: stock ? Number(stock.currentQuantity) : (pJson.initialQuantity || 0),
          reorderThreshold: stock ? Number(stock.reorderThreshold) : Number(pJson.reorderThreshold || 20),
          isLowStock: stock ? Number(stock.currentQuantity) <= Number(stock.reorderThreshold || 20) : false
        };
      });
    } catch (dbErr) {
      console.warn('[Products DB query]:', dbErr.message);
      productsWithStock = [];
    }

    res.status(200).json({ success: true, count: (productsWithStock || []).length, products: productsWithStock || [] });
  } catch (error) {
    res.status(200).json({ success: true, count: 0, products: [] });
  }
};


// @route   GET /api/products/:id
// @desc    Get single product by ID, Barcode, or QR Code
// @access  Private
export const getProductById = async (req, res) => {
  try {
    let product;
    const idParam = req.params.id;

    if (!isNaN(idParam)) {
      product = await Product.findByPk(idParam, {
        include: [{ model: Stock, as: 'stock' }]
      });
    }

    if (!product) {
      product = await Product.findOne({
        where: {
          [Op.or]: [
            { qrCode: idParam },
            { barcode: idParam }
          ]
        },
        include: [{ model: Stock, as: 'stock' }]
      });
    }

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found with this ID or QR code' });
    }

    const pJson = product.toJSON();
    const stock = pJson.stock;

    res.status(200).json({
      success: true,
      product: {
        ...pJson,
        _id: pJson.id,
        currentQuantity: stock ? Number(stock.currentQuantity) : 0,
        reorderThreshold: stock ? Number(stock.reorderThreshold) : Number(pJson.reorderThreshold || 20)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   POST /api/products
// @desc    Create new product + create associated stock document
// @access  Private/Admin
export const createProduct = async (req, res) => {
  try {
    const { name, category, unit, unitPrice, costPrice, qrCode, barcode, description, imageUrl, shelfLifeDays, reorderThreshold } = req.body;

    if (!name || !category || !unit || unitPrice === undefined) {
      return res.status(400).json({ success: false, message: 'Name, category, unit, and unit price are required' });
    }

    // Generate unique QR code identifier if not explicitly provided
    const generatedQr = qrCode && qrCode.trim() 
      ? qrCode.trim().toUpperCase() 
      : `DAIRY-${category.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-6)}`;

    // Check duplicate QR
    const existingQr = await Product.findOne({ where: { qrCode: generatedQr } });
    if (existingQr) {
      return res.status(400).json({ success: false, message: `A product with QR code "${generatedQr}" already exists` });
    }

    const product = await Product.create({
      name,
      category,
      unit,
      unitPrice: Number(unitPrice),
      costPrice: costPrice ? Number(costPrice) : Math.round(Number(unitPrice) * 0.8),
      qrCode: generatedQr,
      barcode: barcode ? barcode.trim() : null,
      description: description || '',
      imageUrl: imageUrl || '',
      shelfLifeDays: shelfLifeDays ? Number(shelfLifeDays) : 3,
      reorderThreshold: reorderThreshold ? Number(reorderThreshold) : 20
    });

    // Create corresponding Stock record
    await Stock.create({
      productId: product.id,
      currentQuantity: 0,
      reorderThreshold: product.reorderThreshold,
      lastUpdated: new Date()
    });

    await logAudit({
      req,
      action: 'CREATE',
      entityType: 'Product',
      entityId: product.id,
      details: `Created product "${product.name}" (${product.category}) with QR "${product.qrCode}" and Barcode "${product.barcode || 'N/A'}"`
    });

    const pJson = product.toJSON();
    pJson._id = pJson.id;

    res.status(201).json({ success: true, message: `Product "${product.name}" created successfully`, product: pJson });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   PUT /api/products/:id
// @desc    Update product details
// @access  Private/Admin
export const updateProduct = async (req, res) => {
  try {
    const { name, category, unit, unitPrice, costPrice, qrCode, barcode, description, imageUrl, shelfLifeDays, reorderThreshold, isActive } = req.body;
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (qrCode && qrCode !== product.qrCode) {
      const duplicate = await Product.findOne({
        where: {
          qrCode: qrCode.trim().toUpperCase(),
          id: { [Op.ne]: product.id }
        }
      });
      if (duplicate) {
        return res.status(400).json({ success: false, message: `QR Code "${qrCode}" is already in use by another product` });
      }
      product.qrCode = qrCode.trim().toUpperCase();
    }

    if (barcode !== undefined) product.barcode = barcode ? barcode.trim() : null;
    if (name) product.name = name;
    if (category) product.category = category;
    if (unit) product.unit = unit;
    if (unitPrice !== undefined) product.unitPrice = Number(unitPrice);
    if (costPrice !== undefined) product.costPrice = Number(costPrice);
    if (description !== undefined) product.description = description;
    if (imageUrl !== undefined) product.imageUrl = imageUrl;
    if (shelfLifeDays !== undefined) product.shelfLifeDays = Number(shelfLifeDays);
    if (isActive !== undefined) product.isActive = isActive;

    if (reorderThreshold !== undefined) {
      product.reorderThreshold = Number(reorderThreshold);
      await Stock.update(
        { reorderThreshold: Number(reorderThreshold) },
        { where: { productId: product.id } }
      );
    }

    await product.save();

    await logAudit({
      req,
      action: 'UPDATE',
      entityType: 'Product',
      entityId: product.id,
      details: `Updated product "${product.name}" details`
    });

    const pJson = product.toJSON();
    pJson._id = pJson.id;

    res.status(200).json({ success: true, message: `Product "${product.name}" updated successfully`, product: pJson });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   DELETE /api/products/:id
// @desc    Delete product and associated stock
// @access  Private/Admin
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const prodName = product.name;
    await product.destroy();

    await logAudit({
      req,
      action: 'DELETE',
      entityType: 'Product',
      entityId: req.params.id,
      details: `Admin deleted product "${prodName}"`
    });

    res.status(200).json({ success: true, message: `Product "${prodName}" deleted successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==============================================================================
// BARCODE INTELLIGENCE REGISTRY & LOOKUP
// ==============================================================================

// GS1 India & International Company Prefix Registry (EAN-13 standard)
const GS1_COMPANY_PREFIXES = {
  // GS1 India (Prefix 890...)
  '8901030': { company: 'Hindustan Unilever Limited', brand: 'HUL', category: 'grocery' },
  '8901058': { company: 'Nestlé India Limited', brand: 'Nestlé', category: 'dairy' },
  '8901063': { company: 'Britannia Industries Limited', brand: 'Britannia', category: 'bakery' },
  '8901262': { company: 'Gujarat Cooperative Milk Marketing Federation (Amul)', brand: 'Amul', category: 'milk' },
  '8901491': { company: 'Dabur India Limited', brand: 'Dabur', category: 'beverages' },
  '8901719': { company: 'Parle Products Pvt. Ltd.', brand: 'Parle', category: 'bakery' },
  '8901725': { company: 'Parle Agro Pvt. Ltd.', brand: 'Parle Agro', category: 'beverages' },
  '8901023': { company: 'ITC Limited - Foods Division', brand: 'ITC / Sunfeast', category: 'snacks' },
  '8901396': { company: 'Marico Limited', brand: 'Marico / Saffola', category: 'grocery' },
  '8901012': { company: 'Colgate-Palmolive (India) Limited', brand: 'Colgate', category: 'grocery' },
  '8901088': { company: 'Reckitt Benckiser (India) Pvt. Ltd.', brand: 'Reckitt', category: 'grocery' },
  '8901648': { company: 'Mother Dairy Fruit & Vegetable Pvt. Ltd.', brand: 'Mother Dairy', category: 'milk' },
  '8904063': { company: 'Haldiram Snacks Food Pvt. Ltd.', brand: "Haldiram's", category: 'sweets' },
  '8902080': { company: "Haldiram's Foods International (Nagpur)", brand: "Haldiram's", category: 'snacks' },
  '8904153': { company: 'Bikaji Foods International Limited', brand: 'Bikaji', category: 'snacks' },
  '8906001': { company: 'Patanjali Ayurved Limited', brand: 'Patanjali', category: 'grocery' },
  '8901844': { company: 'PepsiCo India Holdings Pvt. Ltd.', brand: 'PepsiCo', category: 'beverages' },
  '8901072': { company: 'Mondelez India Foods Pvt. Ltd. (Cadbury)', brand: 'Cadbury', category: 'sweets' },
  '8906010': { company: 'Wipro Consumer Care & Lighting', brand: 'Wipro', category: 'grocery' },
  '8906020': { company: 'Hector Beverages Pvt. Ltd. (Paper Boat)', brand: 'Paper Boat', category: 'beverages' },
  '8906007': { company: 'Adani Wilmar Limited (Fortune)', brand: 'Fortune', category: 'grocery' },
  '8908001': { company: 'Bikanervala Foods Pvt. Ltd. (Bikano)', brand: 'Bikano', category: 'sweets' },
  '8901138': { company: 'Vadilal Industries Limited', brand: 'Vadilal', category: 'icecream' },
  '8901248': { company: 'Tata Consumer Products Limited', brand: 'Tata', category: 'grocery' },
  '8901211': { company: 'Balaji Wafers Pvt. Ltd.', brand: 'Balaji', category: 'snacks' },
  '8901233': { company: 'Rasna Private Limited', brand: 'Rasna', category: 'beverages' },
  '8901414': { company: 'Everest Food Products Pvt. Ltd.', brand: 'Everest', category: 'grocery' },
  '8901425': { company: 'MDH Spices (Mahashian Di Hatti)', brand: 'MDH', category: 'grocery' },
  '8906012': { company: "Mrs. Bector's Food Specialities (Cremica)", brand: 'Cremica', category: 'bakery' },
  '8902579': { company: 'Emami Limited', brand: 'Emami', category: 'grocery' },
  '8901103': { company: 'Dharampal Satyapal Group (Catch)', brand: 'Catch', category: 'grocery' },
  '8901304': { company: 'Ushodaya Enterprises (Priya Foods)', brand: 'Priya', category: 'grocery' },

  // International Brands
  '5449000': { company: 'The Coca-Cola Company', brand: 'Coca-Cola', category: 'beverages' },
  '7622210': { company: 'Mondelēz International', brand: 'Mondelez', category: 'sweets' },
  '7613035': { company: 'Société des Produits Nestlé S.A.', brand: 'Nestlé', category: 'dairy' }
};

// Curated Popular Indian Retail Catalog
const CURATED_BARCODE_CATALOG = {
  // Mother Dairy Products
  '8901648001018': {
    name: 'Mother Dairy Full Cream Milk (1L)',
    brand: 'Mother Dairy',
    company: 'Mother Dairy Fruit & Vegetable Pvt. Ltd.',
    category: 'milk',
    unit: '1 Litre',
    unitPrice: 68,
    costPrice: 58,
    shelfLifeDays: 3,
    description: 'Pasteurized Full Cream Milk with 6% fat & 9% SNF'
  },
  '8901648001025': {
    name: 'Mother Dairy Toned Milk (500ml)',
    brand: 'Mother Dairy',
    company: 'Mother Dairy Fruit & Vegetable Pvt. Ltd.',
    category: 'milk',
    unit: '500 ml',
    unitPrice: 28,
    costPrice: 24,
    shelfLifeDays: 3,
    description: 'Pasteurized Toned Milk with 3% fat & 8.5% SNF'
  },
  '8901648001032': {
    name: 'Mother Dairy Cow Milk (500ml)',
    brand: 'Mother Dairy',
    company: 'Mother Dairy Fruit & Vegetable Pvt. Ltd.',
    category: 'milk',
    unit: '500 ml',
    unitPrice: 30,
    costPrice: 25,
    shelfLifeDays: 3,
    description: 'Pure Cow Milk, easily digestible & wholesome'
  },
  '8901648001049': {
    name: 'Mother Dairy Standardized Milk (500ml)',
    brand: 'Mother Dairy',
    company: 'Mother Dairy Fruit & Vegetable Pvt. Ltd.',
    category: 'milk',
    unit: '500 ml',
    unitPrice: 32,
    costPrice: 27,
    shelfLifeDays: 3,
    description: 'Standardized Milk with 4.5% fat & 8.5% SNF'
  },
  '8901648002015': {
    name: 'Mother Dairy Classic Dahi (400g)',
    brand: 'Mother Dairy',
    company: 'Mother Dairy Fruit & Vegetable Pvt. Ltd.',
    category: 'curd',
    unit: '400 g',
    unitPrice: 45,
    costPrice: 36,
    shelfLifeDays: 14,
    description: 'Thick and creamy classic curd made from pure milk'
  },
  '8901648002022': {
    name: 'Mother Dairy Mishti Doi (85g)',
    brand: 'Mother Dairy',
    company: 'Mother Dairy Fruit & Vegetable Pvt. Ltd.',
    category: 'curd',
    unit: '85 g',
    unitPrice: 20,
    costPrice: 15,
    shelfLifeDays: 15,
    description: 'Traditional Bengali sweetened caramelized curd'
  },
  '8901648003012': {
    name: 'Mother Dairy Malai Paneer (200g)',
    brand: 'Mother Dairy',
    company: 'Mother Dairy Fruit & Vegetable Pvt. Ltd.',
    category: 'paneer',
    unit: '200 g',
    unitPrice: 95,
    costPrice: 78,
    shelfLifeDays: 30,
    description: 'Vacuum packed fresh and soft cottage cheese cubes'
  },
  '8901648004019': {
    name: 'Mother Dairy Pure Cow Ghee (1L)',
    brand: 'Mother Dairy',
    company: 'Mother Dairy Fruit & Vegetable Pvt. Ltd.',
    category: 'ghee',
    unit: '1 Litre',
    unitPrice: 650,
    costPrice: 560,
    shelfLifeDays: 270,
    description: 'Aromatic golden cow ghee prepared traditionally'
  },

  // Haldiram's
  '8904063251077': {
    name: "Haldiram's Soan Papdi (250g)",
    brand: "Haldiram's",
    company: 'Haldiram Snacks Food Pvt. Ltd.',
    category: 'sweets',
    unit: '250 g',
    unitPrice: 90,
    costPrice: 72,
    shelfLifeDays: 150,
    description: 'Flaky melt-in-the-mouth sweet pieces garnished with almonds & pistachios'
  },
  '8904063211118': {
    name: "Haldiram's Nagpur Aloo Bhujia (200g)",
    brand: "Haldiram's",
    company: 'Haldiram Snacks Food Pvt. Ltd.',
    category: 'snacks',
    unit: '200 g',
    unitPrice: 55,
    costPrice: 42,
    shelfLifeDays: 180,
    description: 'Spicy potato mint noodle namkeen snack'
  },

  // Amul Products
  '8901262010054': {
    name: 'Amul Taaza Homogenised Toned Milk (1L)',
    brand: 'Amul',
    company: 'Gujarat Cooperative Milk Marketing Federation (Amul)',
    category: 'milk',
    unit: '1 Litre',
    unitPrice: 72,
    costPrice: 62,
    shelfLifeDays: 180,
    description: 'Long shelf life UHT treated toned milk'
  },
  '8901262020015': {
    name: 'Amul Pasteurised Butter (500g)',
    brand: 'Amul',
    company: 'Gujarat Cooperative Milk Marketing Federation (Amul)',
    category: 'butter',
    unit: '500 g',
    unitPrice: 275,
    costPrice: 245,
    shelfLifeDays: 180,
    description: 'Pure salted dairy butter made from fresh cream'
  },
  '8901262030014': {
    name: 'Amul Malai Paneer (200g)',
    brand: 'Amul',
    company: 'Gujarat Cooperative Milk Marketing Federation (Amul)',
    category: 'paneer',
    unit: '200 g',
    unitPrice: 90,
    costPrice: 75,
    shelfLifeDays: 45,
    description: 'Fresh and soft diced paneer'
  },

  // Nestlé
  '8901058852468': {
    name: 'Nestlé Maggi 2-Minute Masala Instant Noodles (70g)',
    brand: 'Nestlé',
    company: 'Nestlé India Limited',
    category: 'snacks',
    unit: '70 g',
    unitPrice: 14,
    costPrice: 11,
    shelfLifeDays: 240,
    description: 'Instant noodles with aromatic masala tastemaker'
  },

  // Britannia
  '8901063012226': {
    name: 'Britannia Good Day Butter Cookies (200g)',
    brand: 'Britannia',
    company: 'Britannia Industries Limited',
    category: 'bakery',
    unit: '200 g',
    unitPrice: 40,
    costPrice: 32,
    shelfLifeDays: 180,
    description: 'Rich butter cookies with signature smiley cuts'
  },

  // Parle
  '8901719101052': {
    name: 'Parle-G Gluco Biscuits (250g)',
    brand: 'Parle',
    company: 'Parle Products Pvt. Ltd.',
    category: 'bakery',
    unit: '250 g',
    unitPrice: 30,
    costPrice: 24,
    shelfLifeDays: 180,
    description: 'Original glucose enriched energy biscuits'
  },

  // HUL
  '8901030383782': {
    name: 'Brooke Bond Red Label Tea (500g)',
    brand: 'Red Label',
    company: 'Hindustan Unilever Limited',
    category: 'beverages',
    unit: '500 g',
    unitPrice: 280,
    costPrice: 235,
    shelfLifeDays: 365,
    description: 'Selected CTC black tea blend for strength and taste'
  }
};

// Helper to determine company & brand from GS1 prefix
const resolveGs1Info = (cleanBarcode) => {
  if (!cleanBarcode || cleanBarcode.length < 7) return null;
  const p7 = cleanBarcode.slice(0, 7);
  if (GS1_COMPANY_PREFIXES[p7]) return GS1_COMPANY_PREFIXES[p7];
  const p6 = cleanBarcode.slice(0, 6);
  if (GS1_COMPANY_PREFIXES[p6]) return GS1_COMPANY_PREFIXES[p6];
  const p5 = cleanBarcode.slice(0, 5);
  if (GS1_COMPANY_PREFIXES[p5]) return GS1_COMPANY_PREFIXES[p5];
  const p3 = cleanBarcode.slice(0, 3);
  if (p3 === '890') {
    return {
      company: 'GS1 India Registered Manufacturer',
      brand: 'Indian FMCG Brand',
      category: 'grocery'
    };
  }
  return null;
};

// Helper to classify categories from tags/text
const mapCategory = (text) => {
  const t = (text || '').toLowerCase();
  if (t.includes('milk') || t.includes('lait') || t.includes('dairy beverage')) return 'milk';
  if (t.includes('paneer') || t.includes('cottage') || t.includes('cheese')) return 'paneer';
  if (t.includes('curd') || t.includes('dahi') || t.includes('yogurt') || t.includes('yoghurt')) return 'curd';
  if (t.includes('ghee')) return 'ghee';
  if (t.includes('butter') || t.includes('beurre')) return 'butter';
  if (t.includes('ice cream') || t.includes('icecream') || t.includes('frozen dessert')) return 'icecream';
  if (t.includes('sweet') || t.includes('mithai') || t.includes('dessert') || t.includes('chocolate') || t.includes('candy') || t.includes('confectionery')) return 'sweets';
  if (t.includes('biscuit') || t.includes('cookie') || t.includes('bakery') || t.includes('bread') || t.includes('cake')) return 'bakery';
  if (t.includes('snack') || t.includes('namkeen') || t.includes('chip') || t.includes('bhujia') || t.includes('noodle')) return 'snacks';
  if (t.includes('tea') || t.includes('coffee') || t.includes('beverage') || t.includes('drink') || t.includes('juice') || t.includes('soda')) return 'beverages';
  return 'sweets';
};

// @route   GET /api/products/lookup-barcode/:barcode
// @desc    Fast real-time barcode intelligence: Local DB -> Curated Catalog -> Live Open Food Facts -> GS1 Prefix Registry
// @access  Private
export const lookupBarcode = async (req, res) => {
  try {
    const rawBarcode = req.params.barcode || '';
    const cleanCode = rawBarcode.toString().trim();

    if (!cleanCode) {
      return res.status(400).json({ success: false, message: 'Valid barcode string is required' });
    }

    // 1. Check in Local Database
    const isNum = !isNaN(cleanCode) && cleanCode.length < 10;
    try {
      const localProduct = await Product.findOne({
        where: {
          [Op.or]: [
            { barcode: cleanCode },
            { qrCode: cleanCode },
            ...(isNum ? [{ id: Number(cleanCode) }] : [])
          ]
        },
        include: [{ model: Stock, as: 'stock' }]
      });

      if (localProduct) {
        const pJson = localProduct.toJSON();
        const stock = pJson.stock;
        
        // Derive real company from name or GS1 prefix
        const gs1 = resolveGs1Info(cleanCode);
        let comp = gs1?.company;
        if (!comp) {
          const lowerName = (pJson.name || '').toLowerCase();
          if (lowerName.includes('mother dairy')) comp = 'Mother Dairy Fruit & Vegetable Pvt. Ltd.';
          else if (lowerName.includes('amul')) comp = 'Gujarat Cooperative Milk Marketing Federation (Amul)';
          else if (lowerName.includes('haldiram')) comp = 'Haldiram Snacks Food Pvt. Ltd.';
          else if (lowerName.includes('nestle') || lowerName.includes('maggi')) comp = 'Nestlé India Limited';
          else if (lowerName.includes('britannia')) comp = 'Britannia Industries Limited';
          else if (lowerName.includes('parle')) comp = 'Parle Products Pvt. Ltd.';
          else comp = `${pJson.name.split(' ')[0]} Direct Supply`;
        }

        return res.status(200).json({
          success: true,
          source: 'local_database',
          product: {
            ...pJson,
            _id: pJson.id,
            companyName: comp,
            supplierName: `${comp} / Authorized Distributor`,
            currentQuantity: stock ? Number(stock.currentQuantity) : 0,
            reorderThreshold: stock ? Number(stock.reorderThreshold) : 20
          }
        });
      }
    } catch (dbErr) {
      console.warn('[Barcode Lookup Local DB]:', dbErr.message);
    }

    // 2. Check in Curated Indian Catalog (Zero latency exact match)
    if (CURATED_BARCODE_CATALOG[cleanCode]) {
      const item = CURATED_BARCODE_CATALOG[cleanCode];
      return res.status(200).json({
        success: true,
        source: 'curated_catalog',
        product: {
          name: item.name,
          brand: item.brand,
          companyName: item.company,
          supplierName: `${item.company} / Direct Distributor`,
          category: item.category,
          unit: item.unit,
          unitPrice: item.unitPrice,
          costPrice: item.costPrice,
          shelfLifeDays: item.shelfLifeDays,
          barcode: cleanCode,
          description: item.description,
          currentQuantity: 0,
          reorderThreshold: 15
        }
      });
    }

    // 3. Query Live Open Food Facts API (India & Global)
    let liveData = null;
    const offEndpoints = [
      `https://in.openfoodfacts.org/api/v0/product/${encodeURIComponent(cleanCode)}.json`,
      `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(cleanCode)}.json`
    ];

    for (const url of offEndpoints) {
      try {
        const fetchRes = await fetch(url, {
          headers: {
            'User-Agent': 'MotherDairyRetailInventory/2.0 (contact@motherdairy.app)',
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(4500)
        });

        if (fetchRes.ok) {
          const json = await fetchRes.json();
          if (json && (json.status === 1 || json.product)) {
            liveData = json.product;
            break;
          }
        }
      } catch (err) {
        // Continue to next endpoint or GS1 fallback
      }
    }

    const gs1 = resolveGs1Info(cleanCode);

    if (liveData) {
      const brand = (liveData.brands || gs1?.brand || 'Retail Brand').split(',')[0].trim();
      const rawName = liveData.product_name_en || liveData.product_name || liveData.generic_name || `${brand} Item`;
      const weight = liveData.quantity || liveData.product_quantity_unit ? `${liveData.product_quantity || ''} ${liveData.product_quantity_unit || ''}`.trim() : (liveData.net_weight || '');
      const fullName = weight && !rawName.includes(weight) ? `${rawName} (${weight})` : rawName;

      // Extract Company / Manufacturer
      let company = liveData.brand_owner || liveData.manufacturer || gs1?.company || `${brand} Foods / Manufacturing`;
      company = company.replace(/\[|\]/g, '').trim();

      const cat = mapCategory(
        [liveData.categories, liveData.categories_tags?.join(' '), liveData.product_name, gs1?.category].filter(Boolean).join(' ')
      );

      const estPrice = liveData.price || 50;
      const costPrice = Math.round(estPrice * 0.8);

      return res.status(200).json({
        success: true,
        source: 'open_food_facts',
        product: {
          name: fullName,
          brand,
          companyName: company,
          supplierName: `${company} / Direct Distributor`,
          category: cat,
          unit: weight || 'pack',
          unitPrice: estPrice,
          costPrice,
          shelfLifeDays: cat === 'milk' ? 3 : (cat === 'paneer' || cat === 'curd' ? 15 : 120),
          barcode: cleanCode,
          imageUrl: liveData.image_url || liveData.image_front_url || '',
          description: liveData.generic_name || liveData.ingredients_text || `Live product verified via Barcode: ${cleanCode}`,
          currentQuantity: 0,
          reorderThreshold: 15
        }
      });
    }

    // 4. GS1 Prefix Intelligence (If Open Food Facts doesn't have the specific SKU)
    if (gs1) {
      return res.status(200).json({
        success: true,
        source: 'gs1_registry',
        product: {
          name: `${gs1.brand} Product (${cleanCode.slice(-4)})`,
          brand: gs1.brand,
          companyName: gs1.company,
          supplierName: `${gs1.company} / Direct Distributor`,
          category: gs1.category || 'grocery',
          unit: 'pack',
          unitPrice: 60,
          costPrice: 48,
          shelfLifeDays: 90,
          barcode: cleanCode,
          description: `Identified via GS1 India Prefix Registry: ${gs1.company}`,
          currentQuantity: 0,
          reorderThreshold: 15
        }
      });
    }

    // 5. Generic Unlisted Barcode Draft (Accurate dynamic naming, never hardcoding another company)
    const country = cleanCode.startsWith('890') ? 'India' : 'International';
    return res.status(200).json({
      success: true,
      source: 'unlisted_draft',
      product: {
        name: `Scanned Item (${cleanCode})`,
        brand: 'Direct Manufacturer',
        companyName: `Retail Manufacturer (${country})`,
        supplierName: `Local Wholesale Supplier`,
        category: 'sweets',
        unit: 'pack',
        unitPrice: 50,
        costPrice: 40,
        shelfLifeDays: 60,
        barcode: cleanCode,
        description: `Scanned ${country} Retail Barcode: ${cleanCode}`,
        currentQuantity: 0,
        reorderThreshold: 10
      }
    });

  } catch (error) {
    console.error('[Barcode Lookup Service Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Error resolving barcode intelligence' });
  }
};

// @route   GET /api/products/:id/qr
// @desc    Generate printable QR Code image (Data URL / PNG)
// @access  Private
export const generateQrCodeImage = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const qrPayload = JSON.stringify({
      id: product.id,
      qrCode: product.qrCode,
      name: product.name,
      category: product.category,
      unit: product.unit,
      price: product.unitPrice
    });

    const qrDataUrl = await QRCode.toDataURL(product.qrCode, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 320,
      color: {
        dark: '#1e3a1e',
        light: '#FFFFFF'
      }
    });

    res.status(200).json({
      success: true,
      qrCode: product.qrCode,
      productName: product.name,
      qrDataUrl,
      qrPayload
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


