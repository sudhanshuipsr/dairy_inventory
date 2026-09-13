import bcrypt from 'bcryptjs';
import { sequelize, User, Product, Stock, Purchase, Sale, ExpiryBatch, Production, ProductionOutput, AuditLog, Feedback } from '../models/index.js';

import { addStock } from '../services/stockSyncService.js';

export const DEMO_PRODUCTS = [
  {
    name: 'Mother Dairy Full Cream Milk (1L)',
    category: 'milk',
    unit: 'litre',
    unitPrice: 68,
    costPrice: 54,
    qrCode: 'MD-MILK-FC-1L',
    barcode: '8901648001018',
    description: 'Pasteurized homogenized full cream milk with 6.0% FAT & 9.0% SNF.',
    shelfLifeDays: 2,
    reorderThreshold: 25,
    initialQuantity: 80
  },
  {
    name: 'Mother Dairy Toned Milk (500ml)',
    category: 'milk',
    unit: 'packet',
    unitPrice: 28,
    costPrice: 22,
    qrCode: 'MD-MILK-TONED-500M',
    barcode: '8901648001025',
    description: 'Fresh toned milk with 3.0% FAT & 8.5% SNF.',
    shelfLifeDays: 2,
    reorderThreshold: 30,
    initialQuantity: 120
  },
  {
    name: 'Mother Dairy Live Cow Milk (1L)',
    category: 'milk',
    unit: 'litre',
    unitPrice: 58,
    costPrice: 46,
    qrCode: 'MD-MILK-COW-1L',
    barcode: '8901648001032',
    description: '100% natural, easily digestible cow milk rich in Calcium.',
    shelfLifeDays: 2,
    reorderThreshold: 20,
    initialQuantity: 60
  },
  {
    name: 'Fresh Chilled Raw Cow Milk (Bulk)',
    category: 'raw-milk',
    unit: 'litre',
    unitPrice: 48,
    costPrice: 40,
    qrCode: 'MD-RAW-COW-BULK',
    barcode: '8901648001049',
    description: 'Direct farm milk collected from local dairy farmers for processing.',
    shelfLifeDays: 1,
    reorderThreshold: 50,
    initialQuantity: 200
  },
  {
    name: 'Mother Dairy Classic Dahi / Curd (400g)',
    category: 'curd',
    unit: 'pack',
    unitPrice: 45,
    costPrice: 34,
    qrCode: 'MD-DAHI-CLASSIC-400G',
    barcode: '8901648002015',
    description: 'Thick, creamy, naturally fermented curd.',
    shelfLifeDays: 6,
    reorderThreshold: 20,
    initialQuantity: 45
  },
  {
    name: 'Mother Dairy Probiotic Dahi (200g)',
    category: 'curd',
    unit: 'tub',
    unitPrice: 30,
    costPrice: 22,
    qrCode: 'MD-DAHI-PROBIOTIC-200G',
    barcode: '8901648002022',
    description: 'Probiotic dahi enriched with BB-12 gut-friendly bacteria.',
    shelfLifeDays: 7,
    reorderThreshold: 15,
    initialQuantity: 30
  },
  {
    name: 'Mother Dairy Authentic Mishti Doi (100g)',
    category: 'curd',
    unit: 'cup',
    unitPrice: 25,
    costPrice: 18,
    qrCode: 'MD-DOI-MISHTI-100G',
    barcode: '8901648002039',
    description: 'Traditional caramelized sweet curd in terracotta style cup.',
    shelfLifeDays: 7,
    reorderThreshold: 15,
    initialQuantity: 35
  },
  {
    name: 'Mother Dairy Malai Paneer (200g)',
    category: 'paneer',
    unit: 'packet',
    unitPrice: 95,
    costPrice: 75,
    qrCode: 'MD-PANEER-MALAI-200G',
    barcode: '8901648003012',
    description: 'Ultra-soft malai paneer with rich texture and pure milk goodness.',
    shelfLifeDays: 15,
    reorderThreshold: 20,
    initialQuantity: 50
  },
  {
    name: 'Mother Dairy Low Fat Paneer (200g)',
    category: 'paneer',
    unit: 'packet',
    unitPrice: 105,
    costPrice: 82,
    qrCode: 'MD-PANEER-LOWFAT-200G',
    barcode: '8901648003029',
    description: 'High protein, low cholesterol diet paneer.',
    shelfLifeDays: 15,
    reorderThreshold: 10,
    initialQuantity: 25
  },
  {
    name: 'Mother Dairy Pure Cow Ghee (1L Tin)',
    category: 'ghee',
    unit: 'tin',
    unitPrice: 680,
    costPrice: 540,
    qrCode: 'MD-GHEE-COW-1L',
    description: 'Golden granular aroma ghee made from pure cow milk.',
    shelfLifeDays: 180,
    reorderThreshold: 10,
    initialQuantity: 30
  },
  {
    name: 'Mother Dairy Premium Desi Ghee (500ml)',
    category: 'ghee',
    unit: 'bottle',
    unitPrice: 360,
    costPrice: 290,
    qrCode: 'MD-GHEE-DESI-500M',
    description: 'Rich aroma clarified butter crafted through traditional bilona churning.',
    shelfLifeDays: 180,
    reorderThreshold: 15,
    initialQuantity: 40
  },
  {
    name: 'Mother Dairy Pasteurized Table Butter (100g)',
    category: 'butter',
    unit: 'packet',
    unitPrice: 58,
    costPrice: 46,
    qrCode: 'MD-BUTTER-SALTED-100G',
    description: 'Creamy salted yellow butter for bread and breakfast.',
    shelfLifeDays: 90,
    reorderThreshold: 25,
    initialQuantity: 65
  },
  {
    name: 'Mother Dairy White Makhan (200g)',
    category: 'butter',
    unit: 'packet',
    unitPrice: 120,
    costPrice: 95,
    qrCode: 'MD-BUTTER-WHITE-200G',
    description: 'Unsalted traditional desi white butter.',
    shelfLifeDays: 30,
    reorderThreshold: 10,
    initialQuantity: 20
  },
  {
    name: 'Mother Dairy Fresh Cream 25% Fat (250ml)',
    category: 'cream',
    unit: 'tetra-pack',
    unitPrice: 70,
    costPrice: 55,
    qrCode: 'MD-CREAM-FRESH-250M',
    description: 'Smooth cooking and whipping cream.',
    shelfLifeDays: 60,
    reorderThreshold: 15,
    initialQuantity: 35
  },
  {
    name: 'Mother Dairy Diced Mozzarella Cheese (200g)',
    category: 'cheese',
    unit: 'packet',
    unitPrice: 140,
    costPrice: 110,
    qrCode: 'MD-CHEESE-MOZZ-200G',
    description: 'Perfect melting stretch cheese for pizza and pasta.',
    shelfLifeDays: 60,
    reorderThreshold: 12,
    initialQuantity: 25
  },
  {
    name: 'Mother Dairy Processed Cheese Slices (10 Slices)',
    category: 'cheese',
    unit: 'packet',
    unitPrice: 155,
    costPrice: 122,
    qrCode: 'MD-CHEESE-SLICE-10S',
    description: 'Individually wrapped creamy cheese slices.',
    shelfLifeDays: 90,
    reorderThreshold: 15,
    initialQuantity: 30
  },
  {
    name: 'Mother Dairy Tadka Masala Chaas (200ml)',
    category: 'buttermilk',
    unit: 'packet',
    unitPrice: 15,
    costPrice: 11,
    qrCode: 'MD-CHAAS-MASALA-200M',
    description: 'Refreshing spiced buttermilk with cumin, ginger, and curry leaves.',
    shelfLifeDays: 4,
    reorderThreshold: 40,
    initialQuantity: 90
  },
  {
    name: 'Mother Dairy Sweet Lassi (250ml)',
    category: 'beverages',
    unit: 'bottle',
    unitPrice: 30,
    costPrice: 22,
    qrCode: 'MD-LASSI-SWEET-250M',
    description: 'Chilled rich traditional sweet lassi.',
    shelfLifeDays: 10,
    reorderThreshold: 25,
    initialQuantity: 45
  },
  {
    name: 'Mother Dairy Mango Lassi (250ml)',
    category: 'beverages',
    unit: 'bottle',
    unitPrice: 35,
    costPrice: 26,
    qrCode: 'MD-LASSI-MANGO-250M',
    description: 'Alphonso mango blended thick yogurt beverage.',
    shelfLifeDays: 10,
    reorderThreshold: 25,
    initialQuantity: 40
  },
  {
    name: 'Mother Dairy Sponge Rasgulla (1kg Tin)',
    category: 'sweets',
    unit: 'tin',
    unitPrice: 240,
    costPrice: 185,
    qrCode: 'MD-SWEET-RASGULLA-1KG',
    description: 'Spongy soft cottage cheese balls soaked in pure sugar syrup.',
    shelfLifeDays: 120,
    reorderThreshold: 8,
    initialQuantity: 18
  },
  {
    name: 'Mother Dairy Shahi Gulab Jamun (1kg Tin)',
    category: 'sweets',
    unit: 'tin',
    unitPrice: 260,
    costPrice: 200,
    qrCode: 'MD-SWEET-GULABJAM-1KG',
    description: 'Fried khoya dumplings infused with cardamom and saffron syrup.',
    shelfLifeDays: 120,
    reorderThreshold: 8,
    initialQuantity: 20
  },
  {
    name: 'Fresh Pure Mawa / Khoya (500g)',
    category: 'khoya',
    unit: 'packet',
    unitPrice: 210,
    costPrice: 165,
    qrCode: 'MD-KHOYA-MAWA-500G',
    description: 'Dense evaporated whole milk solids for sweet making.',
    shelfLifeDays: 5,
    reorderThreshold: 10,
    initialQuantity: 22
  },
  {
    name: 'Mother Dairy Kulfi Stick (60ml)',
    category: 'ice-cream',
    unit: 'piece',
    unitPrice: 25,
    costPrice: 18,
    qrCode: 'MD-ICE-KULFI-60M',
    description: 'Rich malai rabdi kulfi with crushed almonds and pistachios.',
    shelfLifeDays: 90,
    reorderThreshold: 30,
    initialQuantity: 60
  },
  {
    name: 'Mother Dairy Skimmed Milk Powder (1kg)',
    category: 'dairy-powder',
    unit: 'packet',
    unitPrice: 380,
    costPrice: 300,
    qrCode: 'MD-POWDER-SMP-1KG',
    description: 'Spray dried instant soluble skimmed milk powder.',
    shelfLifeDays: 365,
    reorderThreshold: 10,
    initialQuantity: 15
  },
  {
    name: 'Mother Dairy Whey Protein Isolate (1kg)',
    category: 'whey-protein',
    unit: 'jar',
    unitPrice: 1850,
    costPrice: 1450,
    qrCode: 'MD-WHEY-ISOLATE-1KG',
    description: '90% pure unflavored ultra-filtered whey protein.',
    shelfLifeDays: 365,
    reorderThreshold: 5,
    initialQuantity: 12
  },
  {
    name: 'Mother Dairy Creamy Cheese Spread (200g)',
    category: 'spreads',
    unit: 'tub',
    unitPrice: 115,
    costPrice: 90,
    qrCode: 'MD-SPREAD-CHEESE-200G',
    description: 'Smooth spreadable cheddar cheese for toast and bagels.',
    shelfLifeDays: 90,
    reorderThreshold: 12,
    initialQuantity: 28
  },
  {
    name: 'Balanced Dairy Cattle Feed Pellets (50kg)',
    category: 'cattle-feed',
    unit: 'bag',
    unitPrice: 1450,
    costPrice: 1200,
    qrCode: 'MD-FEED-CATTLE-50KG',
    description: 'Nutrient-rich balanced feed with 22% crude protein for dairy cows.',
    shelfLifeDays: 180,
    reorderThreshold: 10,
    initialQuantity: 16
  }
];

export const initializeDefaultUsers = async () => {
  try {
    let admin = await User.findOne({ where: { email: 'admin@dairy.com' } });
    if (!admin) {
      const salt = await bcrypt.genSalt(10);
      const adminPassword = await bcrypt.hash('admin123', salt);

      admin = await User.create({
        name: 'Mother Dairy Admin',
        email: 'admin@dairy.com',
        password: adminPassword,
        role: 'admin',
        phone: '+91 98765 43210'
      });
      console.log('[MySQL Init] Created default admin account (admin@dairy.com / admin123)');
    }

    let staff = await User.findOne({ where: { email: 'staff@dairy.com' } });
    if (!staff) {
      const salt = await bcrypt.genSalt(10);
      const staffPassword = await bcrypt.hash('staff123', salt);

      staff = await User.create({
        name: 'Plant Operations Staff',
        email: 'staff@dairy.com',
        password: staffPassword,
        role: 'staff',
        phone: '+91 98111 22334'
      });
      console.log('[MySQL Init] Created default staff account (staff@dairy.com / staff123)');
    }

    return { admin, staff };
  } catch (error) {
    console.error('[MySQL Seed Error]:', error.message);
  }
};

export const seedFinancialReports = async (adminId = 1) => {
  try {
    console.log('[Seed Financial] Generating 30 days of demo financial records...');

    const products = await Product.findAll({ where: { isActive: true } });
    if (!products || products.length === 0) {
      console.log('[Seed Financial] No products found.');
      return;
    }

    const customers = [
      'Walk-in Retail Customer',
      'Gupta Sweet Mart & Dairy',
      'Sharma Bakery & Cafe',
      'Aggarwal Daily Store',
      'Morning Express Delivery Route',
      'Verma General Store',
      'Mother Dairy Booth #14 Wholesale',
      'Hotel Grand Heritage',
      'Sai Rasoi Canteen',
      'Local Resident Subscription #412'
    ];

    const suppliers = [
      'Mother Dairy Processing Plant (Patparganj)',
      'Mother Dairy Regional Plant (Pilkhuwa)',
      'Anand Milk Producers Cooperative Union',
      'Karnal Bulk Dairy Chilling Center',
      'Bhatinda Agro Products Ltd',
      'Haryana Dairy Development Federation'
    ];

    const paymentModes = ['UPI', 'Cash', 'Card', 'UPI', 'Cash'];

    const now = new Date();
    const salesToCreate = [];
    const purchasesToCreate = [];
    const productionsToCreate = [];

    // Loop through past 30 days
    for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
      const currentDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;

      // 1. Generate 5 - 10 Sales transactions per day
      const numSales = isWeekend ? Math.floor(Math.random() * 5) + 6 : Math.floor(Math.random() * 4) + 4;
      
      for (let s = 0; s < numSales; s++) {
        const randomProd = products[Math.floor(Math.random() * products.length)];
        const qty = Math.floor(Math.random() * 8) + 2;
        const sellingPrice = Number(randomProd.unitPrice);
        const costPrice = Number(randomProd.costPrice || Math.round(sellingPrice * 0.8));
        const total = qty * sellingPrice;
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const paymentMode = paymentModes[Math.floor(Math.random() * paymentModes.length)];

        const saleHour = 7 + Math.floor(Math.random() * 14);
        const saleMin = Math.floor(Math.random() * 60);
        const saleDate = new Date(currentDate);
        saleDate.setHours(saleHour, saleMin, 0, 0);

        salesToCreate.push({
          productId: randomProd.id,
          quantity: qty,
          sellingPrice: sellingPrice,
          costPriceSnapshot: costPrice,
          totalAmount: total,
          customerName: customer,
          outletOrRoute: 'Main Counter POS',
          paymentMode: paymentMode,
          date: saleDate,
          addedBy: adminId
        });
      }

      // 2. Generate Purchases every 2-3 days
      if (dayOffset % 2 === 0 || dayOffset === 0) {
        const randomProcureProd = products[Math.floor(Math.random() * products.length)];
        const procureQty = Math.floor(Math.random() * 60) + 40;
        const unitCost = Number(randomProcureProd.costPrice || Math.round(randomProcureProd.unitPrice * 0.8));
        const totalCost = procureQty * unitCost;
        const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];

        const purchaseHour = 5 + Math.floor(Math.random() * 4);
        const purchaseDate = new Date(currentDate);
        purchaseDate.setHours(purchaseHour, 30, 0, 0);

        purchasesToCreate.push({
          productId: randomProcureProd.id,
          supplierName: supplier,
          invoiceNumber: `INV-MD-${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}${String(currentDate.getDate()).padStart(2, '0')}-${String(30 - dayOffset).padStart(3, '0')}`,
          quantity: procureQty,
          costPrice: unitCost,
          totalAmount: totalCost,
          date: purchaseDate,
          addedBy: adminId,
          notes: 'Daily supply replenishment inward'
        });
      }

      // 3. Generate Milk Production logs every 3 days
      if (dayOffset % 3 === 0) {
        const rawMilkProd = products.find(p => p.category === 'raw-milk') || products[0];
        const rawMilkUsed = Math.floor(Math.random() * 150) + 100;
        const prodDate = new Date(currentDate);
        prodDate.setHours(9, 0, 0, 0);

        productionsToCreate.push({
          rawMilkProductId: rawMilkProd.id,
          inputQuantity: rawMilkUsed,
          wastage: Number((Math.random() * 2.5 + 0.5).toFixed(1)),
          batchDate: prodDate,
          addedBy: adminId,
          notes: 'Daily standardized dairy processing batch'
        });
      }
    }

    // Bulk insert all generated records
    await Sale.bulkCreate(salesToCreate);
    await Purchase.bulkCreate(purchasesToCreate);
    const createdProductions = await Production.bulkCreate(productionsToCreate);

    // Create production outputs
    const outputsToCreate = [];
    const paneerProd = products.find(p => p.category === 'paneer');
    const curdProd = products.find(p => p.category === 'curd');
    const gheeProd = products.find(p => p.category === 'ghee');

    for (const prd of createdProductions) {
      if (paneerProd) {
        outputsToCreate.push({
          productionId: prd.id,
          productId: paneerProd.id,
          quantity: Number((prd.inputQuantity * 0.18).toFixed(1))
        });
      }
      if (curdProd) {
        outputsToCreate.push({
          productionId: prd.id,
          productId: curdProd.id,
          quantity: Number((prd.inputQuantity * 0.75).toFixed(1))
        });
      }
      if (gheeProd) {
        outputsToCreate.push({
          productionId: prd.id,
          productId: gheeProd.id,
          quantity: Number((prd.inputQuantity * 0.06).toFixed(1))
        });
      }
    }

    if (outputsToCreate.length > 0) {
      await ProductionOutput.bulkCreate(outputsToCreate);
    }

    console.log(`[Seed Financial] Successfully generated ${salesToCreate.length} Sales invoices, ${purchasesToCreate.length} Purchase inwards, and ${productionsToCreate.length} Production processing batches!`);
    return {
      salesCount: salesToCreate.length,
      purchasesCount: purchasesToCreate.length,
      productionsCount: productionsToCreate.length
    };
  } catch (error) {
    console.error('[Seed Financial Error]:', error.message);
    throw error;
  }
};


export const seedFeedbacks = async () => {
  try {
    const existingCount = await Feedback.count();
    if (existingCount > 0) return;

    console.log('[Seed Feedback] Inserting authentic demo customer ratings...');

    const demoReviews = [
      {
        customerName: 'Rohit Aggarwal',
        phone: '+91 98111 44556',
        rating: 5,
        category: 'Milk Freshness',
        comment: 'Full Cream Milk aur Malai Paneer hamesha fresh aur pure milta hai. Best dairy outlet in our area!',
        status: 'featured',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        customerName: 'Pooja Sharma',
        phone: '+91 98712 33445',
        rating: 5,
        category: 'Ghee & Makhan Quality',
        comment: 'Pure Cow Ghee aroma is authentic like homemade ghee. Packaging and cleanliness is top notch.',
        status: 'featured',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        customerName: 'Anil Kumar Gupta',
        phone: '+91 99554 11223',
        rating: 5,
        category: 'Store Service & Staff',
        comment: 'Very polite staff, quick counter billing with QR code scanner. Highly recommended!',
        status: 'reviewed',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        customerName: 'Dr. Meenakshi Verma',
        phone: '+91 98100 88776',
        rating: 4,
        category: 'Curd & Probiotics',
        comment: 'Mishti Doi and Probiotic Dahi are wonderful for family health. Would love early morning home deliveries.',
        status: 'reviewed',
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
      },
      {
        customerName: 'Vikas Malhotra',
        phone: '+91 97112 99001',
        rating: 5,
        category: 'Sweets & Khoya',
        comment: 'Gulab Jamun tin and Fresh Khoya made festival sweets preparation so easy. 100% pure taste.',
        status: 'featured',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        customerName: 'Sunita Joshi',
        phone: '+91 98991 22334',
        rating: 5,
        category: 'Milk Freshness',
        comment: 'Live Cow milk quality is unmatched. Kids love the morning fresh milk.',
        status: 'reviewed',
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      },
      {
        customerName: 'Kunal Singhal',
        phone: '+91 98765 00112',
        rating: 4,
        category: 'Store Service & Staff',
        comment: 'Good experience overall, clean refrigeration displays and fresh batches every day.',
        status: 'new',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    ];

    await Feedback.bulkCreate(demoReviews);
    console.log(`[Seed Feedback] Inserted ${demoReviews.length} customer ratings.`);
  } catch (error) {
    console.error('[Seed Feedback Error]:', error.message);
  }
};

export const seedDemoProducts = async () => {
  try {
    const { admin } = await initializeDefaultUsers();
    const adminId = admin ? admin.id : 1;

    console.log(`[Seed] Inserting ${DEMO_PRODUCTS.length} Mother Dairy demo products...`);

    for (const item of DEMO_PRODUCTS) {
      const [product, created] = await Product.findOrCreate({
        where: { qrCode: item.qrCode },
        defaults: {
          name: item.name,
          category: item.category,
          unit: item.unit,
          unitPrice: item.unitPrice,
          costPrice: item.costPrice,
          qrCode: item.qrCode,
          barcode: item.barcode,
          description: item.description,
          shelfLifeDays: item.shelfLifeDays,
          reorderThreshold: item.reorderThreshold,
          isActive: true
        }
      });

      if (!product.barcode && item.barcode) {
        product.barcode = item.barcode;
        await product.save();
      }

      // Initialize or update stock
      let stock = await Stock.findOne({ where: { productId: product.id } });
      if (!stock) {
        stock = await Stock.create({
          productId: product.id,
          currentQuantity: item.initialQuantity || 20,
          reorderThreshold: item.reorderThreshold,
          lastUpdated: new Date()
        });
      } else if (stock.currentQuantity <= 0) {
        stock.currentQuantity = item.initialQuantity || 20;
        await stock.save();
      }

      // Create an active batch for this product
      const batchExists = await ExpiryBatch.findOne({ where: { productId: product.id } });
      if (!batchExists) {
        const now = new Date();
        const expDate = new Date(now.getTime() + (item.shelfLifeDays || 3) * 24 * 60 * 60 * 1000);
        await ExpiryBatch.create({
          productId: product.id,
          batchNumber: `BCH-${item.category.toUpperCase().slice(0, 3)}-${String(product.id).padStart(4, '0')}`,
          manufactureDate: now,
          expiryDate: expDate,
          quantity: item.initialQuantity || 20,
          status: 'fresh',
          addedBy: adminId,
          notes: 'Initial opening stock batch'
        });
      }
    }

    // Seed 30-Day Historical Financial & Sales Invoices
    await seedFinancialReports(adminId);

    // Seed Customer Ratings & Reviews
    await seedFeedbacks();

    console.log('[Seed] Demo products, financial reports, and initial stock initialized successfully.');
    return { success: true, count: DEMO_PRODUCTS.length };
  } catch (error) {
    console.error('[Seed Error]:', error.message);
    throw error;
  }
};

export const clearAllDemoData = async () => {
  try {
    console.log('[Clean] Clearing all products, stock, demo transactions, and batches...');
    try {
      await sequelize.query('TRUNCATE TABLE production_outputs, productions, expiry_batches, sales, purchases, feedbacks, audit_logs, stocks, products CASCADE;');
    } catch (sqlErr) {
      await ProductionOutput.destroy({ where: {}, truncate: { cascade: true } }).catch(() => {});
      await Production.destroy({ where: {}, truncate: { cascade: true } }).catch(() => {});
      await ExpiryBatch.destroy({ where: {}, truncate: { cascade: true } }).catch(() => {});
      await Sale.destroy({ where: {}, truncate: { cascade: true } }).catch(() => {});
      await Purchase.destroy({ where: {}, truncate: { cascade: true } }).catch(() => {});
      await Feedback.destroy({ where: {}, truncate: { cascade: true } }).catch(() => {});
      await AuditLog.destroy({ where: {}, truncate: { cascade: true } }).catch(() => {});
      await Stock.destroy({ where: {}, truncate: { cascade: true } }).catch(() => {});
      await Product.destroy({ where: {}, truncate: { cascade: true } }).catch(() => {});
    }

    await initializeDefaultUsers();
    console.log('[Clean] Fresh ERP initialized with 0 products, 0 stock, and zero transactions.');
    return { success: true, message: 'All demo products, categories, stock, and transactions removed successfully.' };
  } catch (error) {
    console.error('[Clean Error]:', error.message);
    throw error;
  }
};

export const seedDatabase = async () => {
  await initializeDefaultUsers();
  return await seedDemoProducts();
};


