import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';

const app = express();

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// In-Memory Global Datasets for Serverless Runtime (Fresh Clean State)
let PRODUCTS = [];

let PURCHASES = [];
let SALES = [];
let FEEDBACKS = [];

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    platform: 'Vercel Serverless (Ultra Fast)',
    productsCount: PRODUCTS.length,
    timestamp: new Date().toISOString()
  });
});

// Auth Routes
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const isOwner = email?.toLowerCase() === 'sudhanshuipsr@gmail.com';
  const isStaff = !isOwner && email?.toLowerCase()?.includes('staff');
  const user = {
    id: isOwner ? 3 : isStaff ? 2 : 1,
    _id: isOwner ? 3 : isStaff ? 2 : 1,
    name: isOwner ? 'Sudhanshu (Owner)' : isStaff ? 'Store Staff Counter' : 'Mother Dairy Admin',
    email: email || (isOwner ? 'sudhanshuipsr@gmail.com' : 'admin@dairy.com'),
    role: isStaff ? 'staff' : 'admin'
  };
  const token = 'demo-admin-jwt-token-2026';
  res.status(200).json({ success: true, message: `Welcome ${user.name}!`, user, token });
});

app.get('/api/auth/me', (req, res) => {
  res.status(200).json({
    success: true,
    user: { id: 1, _id: 1, name: 'Mother Dairy Admin', email: 'admin@dairy.com', role: 'admin' }
  });
});

// Helper to extract exact MRP from product title, tags, or text
const extractPriceFromText = (text) => {
  if (!text) return null;
  const match = text.match(/(?:₹|rs\.?|mrp:?|inr)\s*(\d+(?:\.\d+)?)/i);
  if (match && Number(match[1]) > 0 && Number(match[1]) < 15000) {
    return Math.round(Number(match[1]));
  }
  return null;
};

// Helper to estimate realistic Indian MRP by category & quantity if unlisted
const estimateRealisticMrp = (name, category, unit) => {
  const lower = `${name} ${unit}`.toLowerCase();
  if (category === 'ghee' || lower.includes('ghee')) {
    if (lower.includes('1l') || lower.includes('1 l') || lower.includes('1000')) return 650;
    if (lower.includes('500')) return 340;
    return 360;
  }
  if (category === 'butter' || lower.includes('butter')) {
    if (lower.includes('500')) return 275;
    if (lower.includes('100')) return 58;
    return 120;
  }
  if (category === 'paneer' || lower.includes('paneer')) {
    if (lower.includes('1kg')) return 420;
    if (lower.includes('500')) return 220;
    if (lower.includes('200')) return 95;
    return 95;
  }
  if (category === 'milk' || lower.includes('milk')) {
    if (lower.includes('1l') || lower.includes('1 l') || lower.includes('1000')) {
      if (lower.includes('full cream') || lower.includes('gold')) return 68;
      if (lower.includes('cow')) return 58;
      return 56;
    }
    if (lower.includes('500')) {
      if (lower.includes('full cream') || lower.includes('gold')) return 34;
      if (lower.includes('cow')) return 30;
      return 28;
    }
    if (lower.includes('200') || lower.includes('180') || lower.includes('can')) return 30;
    return 32;
  }
  if (category === 'curd' || lower.includes('dahi') || lower.includes('curd')) {
    if (lower.includes('1kg')) return 90;
    if (lower.includes('400')) return 45;
    if (lower.includes('200')) return 25;
    if (lower.includes('85') || lower.includes('mishti')) return 20;
    return 35;
  }
  if (lower.includes('chaach') || lower.includes('buttermilk')) return 15;
  if (lower.includes('lassi')) return 20;
  if (category === 'bakery' || lower.includes('biscuit') || lower.includes('cookies')) {
    if (lower.includes('250') || lower.includes('300')) return 35;
    if (lower.includes('100') || lower.includes('120')) return 20;
    if (lower.includes('50') || lower.includes('60')) return 10;
    return 20;
  }
  if (lower.includes('maggi') || lower.includes('noodle')) {
    if (lower.includes('280') || lower.includes('4-pack')) return 56;
    if (lower.includes('140') || lower.includes('2-pack')) return 28;
    return 14;
  }
  if (lower.includes('bhujia') || lower.includes('sev') || lower.includes('namkeen')) {
    if (lower.includes('400')) return 110;
    if (lower.includes('200')) return 55;
    return 50;
  }
  if (category === 'beverages') {
    if (lower.includes('1.25') || lower.includes('1.5') || lower.includes('2l')) return 70;
    if (lower.includes('600') || lower.includes('750')) return 40;
    if (lower.includes('250') || lower.includes('300') || lower.includes('can')) return 40;
    if (lower.includes('160') || lower.includes('frooti')) return 15;
    return 40;
  }
  return 40;
};

// Curated Barcode Catalog with Authentic Indian MRP
const VERCEL_BARCODE_CATALOG = {
  '8901648001018': { name: 'Mother Dairy Full Cream Milk (1L)', brand: 'Mother Dairy', company: 'Mother Dairy Fruit & Vegetable Pvt. Ltd.', category: 'milk', unit: '1 Litre', unitPrice: 68, costPrice: 58, shelfLifeDays: 3 },
  '8901648001025': { name: 'Mother Dairy Toned Milk (500ml)', brand: 'Mother Dairy', company: 'Mother Dairy Fruit & Vegetable Pvt. Ltd.', category: 'milk', unit: '500 ml', unitPrice: 28, costPrice: 24, shelfLifeDays: 3 },
  '8901648001032': { name: 'Mother Dairy Cow Milk (500ml)', brand: 'Mother Dairy', company: 'Mother Dairy Fruit & Vegetable Pvt. Ltd.', category: 'milk', unit: '500 ml', unitPrice: 30, costPrice: 25, shelfLifeDays: 3 },
  '8901648002015': { name: 'Mother Dairy Classic Dahi (400g)', brand: 'Mother Dairy', company: 'Mother Dairy Fruit & Vegetable Pvt. Ltd.', category: 'curd', unit: '400 g', unitPrice: 45, costPrice: 36, shelfLifeDays: 14 },
  '8901648002022': { name: 'Mother Dairy Mishti Doi (85g)', brand: 'Mother Dairy', company: 'Mother Dairy Fruit & Vegetable Pvt. Ltd.', category: 'curd', unit: '85 g', unitPrice: 20, costPrice: 15, shelfLifeDays: 15 },
  '8901648003012': { name: 'Mother Dairy Malai Paneer (200g)', brand: 'Mother Dairy', company: 'Mother Dairy Fruit & Vegetable Pvt. Ltd.', category: 'paneer', unit: '200 g', unitPrice: 95, costPrice: 78, shelfLifeDays: 30 },
  '8901648004019': { name: 'Mother Dairy Pure Cow Ghee (1L)', brand: 'Mother Dairy', company: 'Mother Dairy Fruit & Vegetable Pvt. Ltd.', category: 'ghee', unit: '1 Litre', unitPrice: 680, costPrice: 560, shelfLifeDays: 270 },
  '8901648004026': { name: 'Mother Dairy Table Butter (100g)', brand: 'Mother Dairy', company: 'Mother Dairy Fruit & Vegetable Pvt. Ltd.', category: 'butter', unit: '100 g', unitPrice: 58, costPrice: 48, shelfLifeDays: 90 },
  '8901262010054': { name: 'Amul Taaza Homogenised Toned Milk (1L)', brand: 'Amul', company: 'Gujarat Cooperative Milk Marketing Federation (Amul)', category: 'milk', unit: '1 Litre', unitPrice: 72, costPrice: 62, shelfLifeDays: 180 },
  '8901262010016': { name: 'Amul Gold Full Cream Milk (1L)', brand: 'Amul', company: 'Gujarat Cooperative Milk Marketing Federation (Amul)', category: 'milk', unit: '1 Litre', unitPrice: 76, costPrice: 66, shelfLifeDays: 180 },
  '8901262020015': { name: 'Amul Pasteurised Butter (500g)', brand: 'Amul', company: 'Gujarat Cooperative Milk Marketing Federation (Amul)', category: 'butter', unit: '500 g', unitPrice: 275, costPrice: 245, shelfLifeDays: 180 },
  '8901262020022': { name: 'Amul Pasteurised Butter (100g)', brand: 'Amul', company: 'Gujarat Cooperative Milk Marketing Federation (Amul)', category: 'butter', unit: '100 g', unitPrice: 58, costPrice: 48, shelfLifeDays: 180 },
  '8901262030014': { name: 'Amul Malai Paneer (200g)', brand: 'Amul', company: 'Gujarat Cooperative Milk Marketing Federation (Amul)', category: 'paneer', unit: '200 g', unitPrice: 90, costPrice: 75, shelfLifeDays: 45 },
  '8901262040013': { name: 'Amul Pure Ghee (1L Tin)', brand: 'Amul', company: 'Gujarat Cooperative Milk Marketing Federation (Amul)', category: 'ghee', unit: '1 Litre', unitPrice: 650, costPrice: 560, shelfLifeDays: 270 },
  '8901262050012': { name: 'Amul Masti Dahi (400g Cup)', brand: 'Amul', company: 'Gujarat Cooperative Milk Marketing Federation (Amul)', category: 'curd', unit: '400 g', unitPrice: 40, costPrice: 32, shelfLifeDays: 15 },
  '8901262050029': { name: 'Amul Masti Spiced Buttermilk (200ml)', brand: 'Amul', company: 'Gujarat Cooperative Milk Marketing Federation (Amul)', category: 'curd', unit: '200 ml', unitPrice: 15, costPrice: 12, shelfLifeDays: 15 },
  '8901058852468': { name: 'Nestlé Maggi 2-Minute Masala Instant Noodles (70g)', brand: 'Nestlé', company: 'Nestlé India Limited', category: 'snacks', unit: '70 g', unitPrice: 14, costPrice: 11, shelfLifeDays: 240 },
  '8901058852475': { name: 'Nestlé Maggi 2-Minute Masala Noodles (140g - 2 Pack)', brand: 'Nestlé', company: 'Nestlé India Limited', category: 'snacks', unit: '140 g', unitPrice: 28, costPrice: 23, shelfLifeDays: 240 },
  '8901058861019': { name: 'Nestlé KitKat 4 Finger Chocolate Bar (37.5g)', brand: 'Nestlé', company: 'Nestlé India Limited', category: 'sweets', unit: '37.5 g', unitPrice: 30, costPrice: 24, shelfLifeDays: 270 },
  '8901058871018': { name: 'Nestlé Munch Crunchy Chocolate Wafer (18g)', brand: 'Nestlé', company: 'Nestlé India Limited', category: 'sweets', unit: '18 g', unitPrice: 10, costPrice: 8, shelfLifeDays: 270 },
  '8901063012226': { name: 'Britannia Good Day Butter Cookies (200g)', brand: 'Britannia', company: 'Britannia Industries Limited', category: 'bakery', unit: '200 g', unitPrice: 40, costPrice: 32, shelfLifeDays: 180 },
  '8901063012219': { name: 'Britannia Good Day Butter Cookies (100g)', brand: 'Britannia', company: 'Britannia Industries Limited', category: 'bakery', unit: '100 g', unitPrice: 20, costPrice: 16, shelfLifeDays: 180 },
  '8901063021112': { name: 'Britannia Marie Gold Tea Biscuits (250g)', brand: 'Britannia', company: 'Britannia Industries Limited', category: 'bakery', unit: '250 g', unitPrice: 35, costPrice: 28, shelfLifeDays: 180 },
  '8901063031111': { name: 'Britannia Milk Bikis Biscuits (100g)', brand: 'Britannia', company: 'Britannia Industries Limited', category: 'bakery', unit: '100 g', unitPrice: 15, costPrice: 12, shelfLifeDays: 180 },
  '8901719101052': { name: 'Parle-G Gluco Biscuits (250g)', brand: 'Parle', company: 'Parle Products Pvt. Ltd.', category: 'bakery', unit: '250 g', unitPrice: 30, costPrice: 24, shelfLifeDays: 180 },
  '8901719101014': { name: 'Parle-G Gluco Biscuits (100g)', brand: 'Parle', company: 'Parle Products Pvt. Ltd.', category: 'bakery', unit: '100 g', unitPrice: 10, costPrice: 8, shelfLifeDays: 180 },
  '8901719131011': { name: 'Parle Hide & Seek Choco Chip Cookies (100g)', brand: 'Parle', company: 'Parle Products Pvt. Ltd.', category: 'bakery', unit: '100 g', unitPrice: 35, costPrice: 28, shelfLifeDays: 180 },
  '8901725101018': { name: 'Frooti Real Mango Drink (160ml Tetra)', brand: 'Parle Agro', company: 'Parle Agro Pvt. Ltd.', category: 'beverages', unit: '160 ml', unitPrice: 15, costPrice: 12, shelfLifeDays: 180 },
  '8904063251077': { name: "Haldiram's Soan Papdi (250g)", brand: "Haldiram's", company: 'Haldiram Snacks Food Pvt. Ltd.', category: 'sweets', unit: '250 g', unitPrice: 90, costPrice: 72, shelfLifeDays: 150 },
  '8904063211118': { name: "Haldiram's Nagpur Aloo Bhujia (200g)", brand: "Haldiram's", company: 'Haldiram Snacks Food Pvt. Ltd.', category: 'snacks', unit: '200 g', unitPrice: 55, costPrice: 42, shelfLifeDays: 180 },
  '8901072001019': { name: 'Cadbury Dairy Milk Chocolate Bar (50g)', brand: 'Cadbury', company: 'Mondelez India Foods Pvt. Ltd.', category: 'sweets', unit: '50 g', unitPrice: 45, costPrice: 36, shelfLifeDays: 270 },
  '8901072001026': { name: 'Cadbury Dairy Milk Chocolate Bar (24g)', brand: 'Cadbury', company: 'Mondelez India Foods Pvt. Ltd.', category: 'sweets', unit: '24 g', unitPrice: 20, costPrice: 16, shelfLifeDays: 270 },
  '8901764011019': { name: 'Maaza Mango Fruit Drink (600ml Bottle)', brand: 'Coca-Cola', company: 'The Coca-Cola Company', category: 'beverages', unit: '600 ml', unitPrice: 40, costPrice: 32, shelfLifeDays: 180 }
};

// Universal Online & Local Barcode Lookup
app.get('/api/products/lookup-barcode/:barcode', async (req, res) => {
  const { barcode } = req.params;
  const clean = (barcode || '').trim();
  const upper = clean.toUpperCase();

  // 1. Check local in-memory/catalog (Exact merchant-saved price)
  const found = PRODUCTS.find(p => 
    (p.barcode && p.barcode.toUpperCase() === upper) ||
    p.qrCode.toUpperCase() === upper ||
    String(p.id) === clean ||
    String(p._id) === clean
  );

  if (found) {
    return res.status(200).json({ success: true, source: 'local', product: found });
  }

  // 2. Check Curated Indian Catalog (Authentic verified MRP)
  if (VERCEL_BARCODE_CATALOG[clean]) {
    const item = VERCEL_BARCODE_CATALOG[clean];
    return res.status(200).json({
      success: true,
      source: 'curated_catalog',
      product: {
        ...item,
        barcode: clean,
        supplierName: `${item.company} / Direct Distributor`,
        currentQuantity: 0,
        reorderThreshold: 15
      }
    });
  }

  // 3. Query Open Food Facts API (Indian & Global FMCG Products)
  try {
    const offRes = await fetch(`https://in.openfoodfacts.org/api/v0/product/${clean}.json`);
    let p = null;
    if (offRes.ok) {
      const data = await offRes.json();
      if (data && (data.status === 1 || data.product)) p = data.product;
    }
    if (!p) {
      const worldRes = await fetch(`https://world.openfoodfacts.org/api/v0/product/${clean}.json`);
      if (worldRes.ok) {
        const wData = await worldRes.json();
        if (wData && (wData.status === 1 || wData.product)) p = wData.product;
      }
    }

    if (p) {
      const brand = (p.brands || '').split(',')[0].trim() || 'Retail Brand';
      const name = p.product_name_en || p.product_name || p.generic_name || `${brand} Item`;
      const weight = p.quantity || p.net_weight || (p.product_quantity_unit ? `${p.product_quantity || ''} ${p.product_quantity_unit}`.trim() : 'pack');
      const fullName = weight && !name.includes(weight) ? `${name} (${weight})` : name;
      
      let cat = 'dairy';
      const cats = (p.categories || '').toLowerCase();
      if (cats.includes('sweet') || cats.includes('dessert') || cats.includes('confectionery')) cat = 'sweets';
      else if (cats.includes('milk') || cats.includes('beverage')) cat = 'milk';
      else if (cats.includes('paneer') || cats.includes('cheese')) cat = 'paneer';
      else if (cats.includes('ghee') || cats.includes('butter') || cats.includes('fat')) cat = 'ghee';
      else if (cats.includes('curd') || cats.includes('yogurt')) cat = 'curd';
      else if (cats.includes('biscuit') || cats.includes('cookie') || cats.includes('bakery')) cat = 'bakery';
      else if (cats.includes('snack') || cats.includes('noodle')) cat = 'snacks';

      const parsedPrice = extractPriceFromText(fullName) || 
        extractPriceFromText(p.product_name) || 
        extractPriceFromText(p.generic_name) || 
        (p.price ? Number(p.price) : null);

      const uPrice = parsedPrice || estimateRealisticMrp(fullName, cat, weight);
      const cPrice = Math.round(uPrice * 0.8);
      const comp = p.brand_owner || p.manufacturer || `${brand} Manufacturing`;

      const detectedProd = {
        name: fullName,
        brand: brand || 'Retail Brand',
        companyName: comp,
        supplierName: `${comp} / Direct Distributor`,
        category: cat,
        barcode: clean,
        unit: weight || 'pack',
        unitPrice: uPrice,
        costPrice: cPrice,
        shelfLifeDays: cat === 'milk' ? 3 : (cat === 'paneer' || cat === 'curd' ? 15 : 120),
        description: p.generic_name || p.ingredients_text || 'Scanned Retail Product',
        image: p.image_front_small_url || p.image_url || null,
        currentQuantity: 0,
        reorderThreshold: 15
      };

      return res.status(200).json({
        success: true,
        source: 'openfoodfacts',
        product: detectedProd
      });
    }
  } catch (err) {
    console.warn('Open Food Facts lookup failed:', err.message);
  }

  // 4. Unlisted / New barcode template
  const isIndia = clean.startsWith('890');
  const estPrice = estimateRealisticMrp(clean, 'dairy', 'pack');
  return res.status(200).json({
    success: true,
    source: 'unlisted',
    product: {
      name: `Retail Item (${clean})`,
      category: 'dairy',
      barcode: clean,
      unit: 'pack',
      unitPrice: estPrice,
      costPrice: Math.round(estPrice * 0.8),
      shelfLifeDays: 30,
      description: `Auto-detected ${isIndia ? 'Indian' : 'Retail'} Barcode: ${clean}`,
      currentQuantity: 0,
      reorderThreshold: 15
    }
  });
});

// Products Routes
app.get('/api/products', (req, res) => {
  const { category, search } = req.query || {};
  let list = PRODUCTS;
  if (category && category !== 'All' && category !== 'all') {
    list = list.filter(p => p.category === category);
  }
  if (search) {
    const s = search.toLowerCase();
    list = list.filter(p => 
      p.name.toLowerCase().includes(s) || 
      p.qrCode.toLowerCase().includes(s) || 
      (p.barcode && p.barcode.toLowerCase().includes(s))
    );
  }
  res.status(200).json({ success: true, count: list.length, products: list });
});

app.get('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const upper = (id || '').trim().toUpperCase();
  const prod = PRODUCTS.find(p => 
    String(p.id) === id || 
    String(p._id) === id || 
    (p.barcode && p.barcode.toUpperCase() === upper) ||
    p.qrCode.toUpperCase() === upper
  );
  if (!prod) {
    return res.status(404).json({ success: false, message: 'Product not found with this code' });
  }
  res.status(200).json({ success: true, product: { ...prod, currentQuantity: prod.currentQuantity || 0 } });
});

app.post('/api/products', (req, res) => {
  const newP = { ...req.body, id: PRODUCTS.length + 1, _id: PRODUCTS.length + 1, currentQuantity: Number(req.body.currentQuantity) || 0, isLowStock: false, isActive: true };
  PRODUCTS.unshift(newP);
  res.status(201).json({ success: true, message: 'Product added successfully!', product: newP });
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const idx = PRODUCTS.findIndex(p => String(p.id) === String(id) || String(p._id) === String(id));
  if (idx !== -1) {
    PRODUCTS[idx] = { ...PRODUCTS[idx], ...req.body };
    return res.status(200).json({ success: true, message: 'Product updated successfully!', product: PRODUCTS[idx] });
  }
  res.status(404).json({ success: false, message: 'Product not found' });
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  PRODUCTS = PRODUCTS.filter(p => String(p.id) !== String(id) && String(p._id) !== String(id));
  res.status(200).json({ success: true, message: 'Product deleted successfully!' });
});

app.post('/api/admin/clear-demo', (req, res) => {
  PRODUCTS = [];
  PURCHASES = [];
  SALES = [];
  FEEDBACKS = [];
  EXPIRY_BATCHES = [];
  PRODUCTIONS = [];
  res.status(200).json({ success: true, message: 'All demo products, categories, stock, and transactions removed successfully.' });
});

// Stock Routes
app.get('/api/stock', (req, res) => {
  const stocks = PRODUCTS.map(p => {
    const pBatches = EXPIRY_BATCHES.filter(b => 
      b.productId?._id == p._id || b.productId?.id == p.id || b.productId == p.id || b.productId == p._id
    );
    return {
      _id: p._id,
      id: p.id,
      productId: p,
      product: p,
      quantity: Number(p.currentQuantity || 0),
      reorderThreshold: p.reorderThreshold || 20,
      status: (p.currentQuantity || 0) <= (p.reorderThreshold || 20) ? 'low' : 'optimal',
      batches: pBatches
    };
  });

  const summary = {
    totalProducts: stocks.length,
    totalQuantity: stocks.reduce((sum, s) => sum + s.quantity, 0),
    lowStockCount: stocks.filter(s => s.quantity <= s.reorderThreshold).length,
    expiringBatchesCount: EXPIRY_BATCHES.filter(b => b.status === 'near-expiry' || b.daysLeft <= 3).length
  };

  res.status(200).json({ success: true, summary, stocks });
});

app.post('/api/stock/inward', (req, res) => {
  const { productId, barcode, productName, name, category, unit, unitPrice, quantity, costPrice, expiryDate, batchNumber, supplierName, notes } = req.body;
  const numQty = Number(quantity) || 1;
  const cleanCode = (barcode || '').toString().trim().toUpperCase();

  let prod = PRODUCTS.find(p => 
    (productId && (String(p.id) === String(productId) || String(p._id) === String(productId))) ||
    (cleanCode && ((p.barcode && p.barcode.toUpperCase() === cleanCode) || p.qrCode.toUpperCase() === cleanCode))
  );

  if (prod) {
    if (unitPrice && Number(unitPrice) > 0) {
      prod.unitPrice = Number(unitPrice);
    }
    if (costPrice !== undefined && costPrice !== '' && Number(costPrice) > 0) {
      prod.costPrice = Number(costPrice);
    }
    if (productName && productName.trim()) {
      prod.name = productName.trim();
    }
  } else {
    const prodName = productName || name || `Retail Item (${cleanCode || 'Barcode'})`;
    const uPrice = Number(unitPrice) || Math.round(Number(costPrice || 50) * 1.25) || 60;
    const cPrice = Number(costPrice) || Math.round(uPrice * 0.8) || 45;
    prod = {
      _id: PRODUCTS.length + 1,
      id: PRODUCTS.length + 1,
      name: prodName,
      category: category || 'dairy',
      unit: unit || 'pack',
      unitPrice: uPrice,
      costPrice: cPrice,
      qrCode: `MD-${cleanCode || Date.now().toString().slice(-6)}`,
      barcode: cleanCode || '',
      description: req.body.description || 'Auto-registered via barcode scan',
      shelfLifeDays: Number(req.body.shelfLifeDays) || 30,
      reorderThreshold: 15,
      currentQuantity: 0,
      isLowStock: false,
      isActive: true
    };
    PRODUCTS.unshift(prod);
  }

  const cost = Number(costPrice) || (prod.costPrice || 30);
  prod.currentQuantity = Number(prod.currentQuantity || 0) + numQty;
  prod.isLowStock = prod.currentQuantity <= (prod.reorderThreshold || 20);

  const batch = batchNumber || `BCH-${(prod.category || 'MLK').slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-5)}`;
  const calcExpiry = expiryDate || new Date(Date.now() + (prod.shelfLifeDays || 3) * 86400000).toISOString().split('T')[0];

  const purchaseItem = {
    id: PURCHASES.length + 1,
    _id: PURCHASES.length + 1,
    productId: prod._id,
    product: { ...prod },
    quantity: numQty,
    costPrice: cost,
    totalAmount: Number((numQty * cost).toFixed(2)),
    supplierName: supplierName || 'Mother Dairy Barcode Inward',
    invoiceNumber: `BAR-${Date.now().toString().slice(-6)}`,
    batchNumber: batch,
    date: new Date().toISOString(),
    notes: notes || 'Quick Barcode Stock Inward'
  };
  PURCHASES.unshift(purchaseItem);

  const expiryBatch = {
    id: EXPIRY_BATCHES.length + 1,
    _id: EXPIRY_BATCHES.length + 1,
    productId: prod,
    product: prod,
    batchNumber: batch,
    manufactureDate: new Date().toISOString().split('T')[0],
    expiryDate: calcExpiry,
    quantity: numQty,
    status: 'fresh',
    daysLeft: prod.shelfLifeDays || 5,
    notes: notes || 'Barcode Inward'
  };
  EXPIRY_BATCHES.unshift(expiryBatch);

  res.status(201).json({
    success: true,
    message: `Successfully added ${numQty} ${prod.unit} of "${prod.name}" to stock!`,
    currentQuantity: prod.currentQuantity,
    product: { ...prod },
    batch: { batchNumber: batch, expiryDate: calcExpiry },
    purchaseId: purchaseItem.id
  });
});

// Purchases Routes
app.get('/api/purchases', (req, res) => {
  const totalSpent = PURCHASES.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  const totalQuantity = PURCHASES.reduce((sum, p) => sum + (p.quantity || 0), 0);
  res.status(200).json({ success: true, count: PURCHASES.length, totalSpent, totalQuantity, purchases: PURCHASES });
});

app.post('/api/purchases', (req, res) => {
  const prodId = req.body.productId?.id || req.body.productId?._id || req.body.productId;
  const prod = PRODUCTS.find(p => String(p.id) === String(prodId) || String(p._id) === String(prodId));
  const qty = Number(req.body.quantity) || 1;
  const cost = Number(req.body.costPrice) || (prod ? prod.costPrice : 30);

  if (prod) {
    prod.currentQuantity = Number(prod.currentQuantity || 0) + qty;
    prod.isLowStock = prod.currentQuantity <= (prod.reorderThreshold || 20);
  }

  const item = {
    ...req.body,
    id: PURCHASES.length + 1,
    _id: PURCHASES.length + 1,
    productId: prod ? prod._id : prodId,
    product: prod ? { ...prod } : { name: 'Item', costPrice: cost },
    quantity: qty,
    costPrice: cost,
    totalAmount: Number((qty * cost).toFixed(2)),
    date: req.body.date ? new Date(req.body.date).toISOString() : new Date().toISOString()
  };
  PURCHASES.unshift(item);
  res.status(201).json({ success: true, message: 'Purchase registered & stock updated successfully!', purchase: item });
});

app.delete('/api/purchases/:id', (req, res) => {
  const { id } = req.params;
  const idx = PURCHASES.findIndex(p => String(p.id) === String(id) || String(p._id) === String(id));
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Purchase record not found' });
  }
  const purchase = PURCHASES[idx];
  const prodId = purchase.productId?.id || purchase.productId?._id || purchase.productId || purchase.product?.id || purchase.product?._id;
  const prod = PRODUCTS.find(p => String(p.id) === String(prodId) || String(p._id) === String(prodId));
  if (prod) {
    prod.currentQuantity = Math.max(0, Number(prod.currentQuantity || 0) - Number(purchase.quantity || 0));
    prod.isLowStock = prod.currentQuantity <= (prod.reorderThreshold || 20);
  }
  PURCHASES.splice(idx, 1);
  res.status(200).json({ success: true, message: 'Purchase deleted and stock adjusted successfully!' });
});

// Sales Routes
app.get('/api/sales', (req, res) => {
  const totalRevenue = SALES.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  res.status(200).json({ success: true, count: SALES.length, totalRevenue, sales: SALES });
});

app.post('/api/sales', (req, res) => {
  const prodId = req.body.productId?.id || req.body.productId?._id || req.body.productId;
  const prod = PRODUCTS.find(p => String(p.id) === String(prodId) || String(p._id) === String(prodId));
  const qty = Number(req.body.quantity) || 1;
  const price = Number(req.body.sellingPrice) || (prod ? prod.unitPrice : 40);
  const cost = Number(prod ? prod.costPrice : Math.round(price * 0.8));

  if (prod) {
    prod.currentQuantity = Math.max(0, Number(prod.currentQuantity || 0) - qty);
    prod.isLowStock = prod.currentQuantity <= (prod.reorderThreshold || 20);
  }

  const item = {
    ...req.body,
    id: SALES.length + 1,
    _id: SALES.length + 1,
    productId: prod ? prod._id : prodId,
    product: prod ? { ...prod } : { name: 'Item', unitPrice: price },
    quantity: qty,
    sellingPrice: price,
    costPriceSnapshot: cost,
    totalAmount: Number((qty * price).toFixed(2)),
    date: req.body.date ? new Date(req.body.date).toISOString() : new Date().toISOString()
  };
  SALES.unshift(item);
  res.status(201).json({
    success: true,
    message: `Sale of ${qty} ${prod?.unit || 'units'} ${prod?.name || 'Item'} recorded & stock updated!`,
    sale: item
  });
});

app.delete('/api/sales/:id', (req, res) => {
  const { id } = req.params;
  const saleIndex = SALES.findIndex(s => String(s.id) === String(id) || String(s._id) === String(id));
  if (saleIndex === -1) {
    return res.status(404).json({ success: false, message: 'Sale record not found' });
  }
  const sale = SALES[saleIndex];
  const prodId = sale.productId?.id || sale.productId?._id || sale.productId || sale.product?.id || sale.product?._id;
  const prod = PRODUCTS.find(p => String(p.id) === String(prodId) || String(p._id) === String(prodId));
  if (prod) {
    prod.currentQuantity = Number(prod.currentQuantity || 0) + Number(sale.quantity || 0);
    prod.isLowStock = prod.currentQuantity <= (prod.reorderThreshold || 20);
  }
  SALES.splice(saleIndex, 1);
  res.status(200).json({ success: true, message: 'Sale deleted and restocked successfully!' });
});

// Dynamic Dashboard & Reports Calculator
function computeDynamicDashboardStats() {
  const totalStockUnits = PRODUCTS.reduce((sum, p) => sum + (Number(p.currentQuantity) || 0), 0);
  const totalInventoryValue = PRODUCTS.reduce((sum, p) => sum + ((Number(p.currentQuantity) || 0) * (Number(p.unitPrice) || 0)), 0);
  const totalInventoryCost = PRODUCTS.reduce((sum, p) => sum + ((Number(p.currentQuantity) || 0) * (Number(p.costPrice) || 0)), 0);

  const lowStockItems = PRODUCTS.filter(p => (Number(p.currentQuantity) || 0) <= (Number(p.reorderThreshold) || 20)).map(p => ({
    id: p.id,
    _id: p._id,
    name: p.name,
    category: p.category,
    unit: p.unit,
    currentQuantity: Number(p.currentQuantity || 0),
    reorderThreshold: Number(p.reorderThreshold || 20),
    unitPrice: Number(p.unitPrice || 0)
  }));

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = SALES.filter(s => (s.date && String(s.date).startsWith(todayStr)));
  const todayPurchases = PURCHASES.filter(p => (p.date && String(p.date).startsWith(todayStr)));

  const effectiveSales = todaySales;
  const effectivePurchases = todayPurchases;

  const todaySalesTotal = effectiveSales.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
  const todaySalesQty = effectiveSales.reduce((sum, s) => sum + Number(s.quantity || 0), 0);
  const todayCOGS = effectiveSales.reduce((sum, s) => sum + ((Number(s.costPriceSnapshot) || Number(s.product?.costPrice) || 30) * Number(s.quantity || 0)), 0);
  const todayGrossProfit = todaySalesTotal - todayCOGS;

  const todayPurchasesTotal = effectivePurchases.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);
  const todayPurchasesQty = effectivePurchases.reduce((sum, p) => sum + Number(p.quantity || 0), 0);

  const batches = typeof EXPIRY_BATCHES !== 'undefined' ? EXPIRY_BATCHES : [];
  const nearBatches = batches.filter(b => b.status === 'near-expiry' || (b.daysLeft && b.daysLeft <= 3));
  const expiredBatches = batches.filter(b => b.status === 'expired' || (b.daysLeft && b.daysLeft <= 0));

  const totalRevenueAll = SALES.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
  const totalPurchasesCostAll = PURCHASES.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);
  const grossProfitAll = totalRevenueAll - totalPurchasesCostAll * 0.85;

  return {
    totalRevenue: Math.round(totalRevenueAll),
    totalPurchasesCost: Math.round(totalPurchasesCostAll),
    grossProfit: Math.round(grossProfitAll),
    profitMargin: totalRevenueAll > 0 ? Number(((grossProfitAll / totalRevenueAll) * 100).toFixed(1)) : 0,
    totalProducts: PRODUCTS.length,
    totalProductsCount: PRODUCTS.length,
    totalStockUnits,
    totalInventoryValue: Math.round(totalInventoryValue),
    totalInventoryCost: Math.round(totalInventoryCost),
    lowStockCount: lowStockItems.length,
    lowStockItems: lowStockItems.slice(0, 8),
    nearExpiryCount: nearBatches.length,
    nearExpiryBatches: nearBatches.slice(0, 6).map(b => ({
      id: b.id,
      _id: b._id,
      batchNumber: b.batchNumber,
      productName: b.product?.name || b.productName || 'Batch Product',
      unit: b.product?.unit || 'unit',
      quantity: Number(b.quantity || 0),
      expiryDate: b.expiryDate
    })),
    expiredCount: expiredBatches.length,
    todaySales: todaySalesTotal,
    todayPurchases: todayPurchasesTotal,
    today: {
      salesAmount: todaySalesTotal,
      salesQuantity: todaySalesQty,
      grossProfit: todayGrossProfit,
      purchasesAmount: todayPurchasesTotal,
      purchasesQuantity: todayPurchasesQty
    },
    recentActivity: {
      sales: SALES.slice(0, 5),
      purchases: PURCHASES.slice(0, 5)
    }
  };
}

// Dashboard & Reports Routes
app.get('/api/reports/dashboard', (req, res) => {
  res.status(200).json({
    success: true,
    stats: computeDynamicDashboardStats()
  });
});

app.get('/api/reports/analytics', (req, res) => {
  const totalSalesAmount = SALES.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
  const totalSalesQuantity = SALES.reduce((sum, s) => sum + Number(s.quantity || 0), 0);
  const totalPurchasesAmount = PURCHASES.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);
  const totalPurchasesQuantity = PURCHASES.reduce((sum, p) => sum + Number(p.quantity || 0), 0);
  const totalCOGS = SALES.reduce((sum, s) => sum + ((Number(s.costPriceSnapshot) || Number(s.product?.costPrice) || 30) * Number(s.quantity || 0)), 0);
  const grossProfit = totalSalesAmount - totalCOGS;
  const netProfit = grossProfit;
  const profitMarginPct = totalSalesAmount > 0 ? Number(((grossProfit / totalSalesAmount) * 100).toFixed(1)) : 0;

  const salesByProduct = {};
  SALES.forEach(s => {
    const pName = s.product?.name || s.productName || 'Product';
    const pId = s.productId?.id || s.productId || s.product?.id || 1;
    const cat = s.product?.category || s.category || 'dairy';
    if (!salesByProduct[pId]) {
      salesByProduct[pId] = { productId: pId, name: pName, category: cat, quantitySold: 0, totalRevenue: 0 };
    }
    salesByProduct[pId].quantitySold += Number(s.quantity || 0);
    salesByProduct[pId].totalRevenue += Number(s.totalAmount || 0);
  });
  const topSelling = Object.values(salesByProduct).sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 5);

  res.status(200).json({
    success: true,
    summary: {
      totalSalesAmount: Math.round(totalSalesAmount),
      totalSalesQuantity,
      totalPurchasesAmount: Math.round(totalPurchasesAmount),
      totalPurchasesQuantity,
      totalCOGS: Math.round(totalCOGS),
      grossProfit: Math.round(grossProfit),
      batchWastageLoss: 0,
      totalWastageUnits: 0,
      netProfit: Math.round(netProfit),
      profitMarginPct
    },
    timeSeries: [],
    categoryBreakdown: [],
    topSelling
  });
});

app.get('/api/reports/export-csv', (req, res) => {
  const type = req.query.type || 'sales';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=mother_dairy_${type}_report.csv`);
  if (type === 'purchases') {
    let csv = 'Date,Invoice,Supplier,Product,Quantity,CostPrice,TotalAmount\n';
    PURCHASES.forEach(p => {
      csv += `${(p.date || '').slice(0, 10)},${p.invoiceNumber || ''},"${p.supplierName || ''}","${p.product?.name || ''}",${p.quantity || 0},${p.costPrice || 0},${p.totalAmount || 0}\n`;
    });
    return res.status(200).send(csv);
  } else {
    let csv = 'Date,Receipt,Customer,Product,Quantity,UnitPrice,TotalAmount\n';
    SALES.forEach(s => {
      csv += `${(s.date || '').slice(0, 10)},${s.receiptNumber || ''},"${s.customerName || 'Walk-in'}","${s.product?.name || ''}",${s.quantity || 0},${s.unitPrice || 0},${s.totalAmount || 0}\n`;
    });
    return res.status(200).send(csv);
  }
});

// Reviews & Feedback
app.get('/api/feedback', (req, res) => {
  const avg = FEEDBACKS.length > 0 
    ? Number((FEEDBACKS.reduce((sum, f) => sum + Number(f.rating || 5), 0) / FEEDBACKS.length).toFixed(1)) 
    : 5.0;
  res.status(200).json({ success: true, count: FEEDBACKS.length, averageRating: avg, feedbacks: FEEDBACKS });
});

app.post('/api/feedback', (req, res) => {
  const fb = { ...req.body, id: FEEDBACKS.length + 1, _id: FEEDBACKS.length + 1, date: new Date().toISOString().split('T')[0] };
  FEEDBACKS.unshift(fb);
  res.status(201).json({ success: true, message: 'Review submitted successfully!', feedback: fb });
});

let EXPIRY_BATCHES = [];

// Expiry Batches Routes
app.get('/api/expiry', (req, res) => {
  const { status, nearExpiryOnly } = req.query || {};
  let list = EXPIRY_BATCHES;
  if (status && status !== 'all') {
    list = list.filter(b => b.status === status);
  }
  if (nearExpiryOnly === 'true') {
    list = list.filter(b => b.status === 'near-expiry' || b.daysLeft <= 3);
  }

  const summary = {
    totalBatches: EXPIRY_BATCHES.length,
    freshCount: EXPIRY_BATCHES.filter(b => b.status === 'fresh').length,
    nearExpiryCount: EXPIRY_BATCHES.filter(b => b.status === 'near-expiry').length,
    nearExpiryRiskUnits: EXPIRY_BATCHES.filter(b => b.status === 'near-expiry').reduce((sum, b) => sum + b.quantity, 0),
    expiredCount: EXPIRY_BATCHES.filter(b => b.status === 'expired').length,
    expiredWastageUnits: EXPIRY_BATCHES.filter(b => b.status === 'expired').reduce((sum, b) => sum + b.quantity, 0),
    discardedCount: EXPIRY_BATCHES.filter(b => b.status === 'discarded').length
  };

  res.status(200).json({ success: true, count: list.length, summary, batches: list });
});

app.get('/api/expiry/batches', (req, res) => {
  res.status(200).json({ success: true, count: EXPIRY_BATCHES.length, batches: EXPIRY_BATCHES });
});

app.post('/api/expiry', (req, res) => {
  const matchedProd = PRODUCTS.find(p => p._id == req.body.productId || p.id == req.body.productId) || PRODUCTS[0];
  const newBatch = {
    ...req.body,
    id: EXPIRY_BATCHES.length + 1,
    _id: EXPIRY_BATCHES.length + 1,
    productId: matchedProd,
    product: matchedProd,
    status: 'fresh',
    daysLeft: 3
  };
  EXPIRY_BATCHES.unshift(newBatch);
  res.status(201).json({ success: true, message: 'Batch logged successfully!', batch: newBatch });
});

app.patch('/api/expiry/:id/discard', (req, res) => {
  const { id } = req.params;
  const batch = EXPIRY_BATCHES.find(b => b.id == id || b._id == id);
  if (batch) {
    batch.status = 'discarded';
    batch.discardReason = req.body?.discardReason || 'Spoiled/Damaged';
  }
  res.status(200).json({ success: true, message: 'Batch discarded and written off!', batch });
});

app.delete('/api/expiry/:id', (req, res) => {
  const { id } = req.params;
  EXPIRY_BATCHES = EXPIRY_BATCHES.filter(b => b.id != id && b._id != id);
  res.status(200).json({ success: true, message: 'Batch removed successfully!' });
});

// Dashboard Stats endpoint alias
app.get('/api/reports/dashboard-stats', (req, res) => {
  res.status(200).json({
    success: true,
    stats: computeDynamicDashboardStats()
  });
});

// Production & Batches
let PRODUCTIONS = [];

app.get('/api/production', (req, res) => {
  res.status(200).json({ success: true, count: PRODUCTIONS.length, batches: PRODUCTIONS });
});

app.post('/api/production', (req, res) => {
  const item = { ...req.body, id: PRODUCTIONS.length + 1, _id: PRODUCTIONS.length + 1, date: new Date().toISOString().split('T')[0], status: 'completed' };
  PRODUCTIONS.unshift(item);
  res.status(201).json({ success: true, message: 'Production batch recorded successfully!', batch: item });
});

app.get('/api/users', (req, res) => {
  res.status(200).json({
    success: true,
    users: [
      { id: 1, _id: 1, name: 'Mother Dairy Admin', email: 'admin@dairy.com', role: 'admin' },
      { id: 2, _id: 2, name: 'Store Staff Counter', email: 'staff@dairy.com', role: 'staff' },
      { id: 3, _id: 3, name: 'Sudhanshu (Owner)', email: 'sudhanshuipsr@gmail.com', role: 'admin' }
    ]
  });
});

app.get('/api/audit-logs', (req, res) => {
  res.status(200).json({ success: true, count: 0, logs: [] });
});

export default function handler(req, res) {
  return app(req, res);
}
