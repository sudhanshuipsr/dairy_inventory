import { Op } from 'sequelize';
import { Product, Stock, Purchase, Sale, Production, ExpiryBatch, ProductionOutput, User } from '../models/index.js';
import { addStock, subtractStock } from '../services/stockSyncService.js';
import { logAudit } from '../middleware/auditLogger.js';

// @route   GET /api/reports/dashboard-stats
// @desc    Get aggregated stats for dashboard counters and quick alerts
// @access  Private
export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      stocks,
      allProducts,
      todayPurchases,
      todaySales,
      nearExpiryBatches,
      expiredBatches,
      recentSales,
      recentPurchases
    ] = await Promise.all([
      Stock.findAll({ include: [{ model: Product, as: 'product' }] }),
      Product.findAll({ where: { isActive: true } }),
      Purchase.findAll({ where: { date: { [Op.gte]: today } } }),
      Sale.findAll({ where: { date: { [Op.gte]: today } } }),
      ExpiryBatch.findAll({
        where: { status: 'near-expiry' },
        include: [{ model: Product, as: 'product' }]
      }),
      ExpiryBatch.findAll({
        where: { status: 'expired' },
        include: [{ model: Product, as: 'product' }]
      }),
      Sale.findAll({
        limit: 5,
        order: [['date', 'DESC']],
        include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'unit'] }]
      }),
      Purchase.findAll({
        limit: 5,
        order: [['date', 'DESC']],
        include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'unit'] }]
      })
    ]);

    // Map stock for each product ensuring every active product is counted
    const stockMap = new Map();
    stocks.forEach((s) => {
      if (s.productId) stockMap.set(Number(s.productId), s);
    });

    const activeStocks = allProducts.map((p) => {
      const s = stockMap.get(Number(p.id));
      const currentQuantity = s ? Number(s.currentQuantity || 0) : 0;
      const reorderThreshold = s ? Number(s.reorderThreshold || 20) : Number(p.reorderThreshold || 20);
      return {
        product: p,
        productId: p.id,
        currentQuantity,
        reorderThreshold
      };
    });

    const totalStockUnits = activeStocks.reduce((sum, s) => sum + Number(s.currentQuantity || 0), 0);
    const totalInventoryValue = activeStocks.reduce(
      (sum, s) => sum + (Number(s.currentQuantity || 0) * Number(s.product?.unitPrice || 0)),
      0
    );
    const totalInventoryCost = activeStocks.reduce(
      (sum, s) => sum + (Number(s.currentQuantity || 0) * Number(s.product?.costPrice || 0)),
      0
    );

    const lowStockItems = activeStocks.filter((s) => Number(s.currentQuantity || 0) <= Number(s.reorderThreshold || 20));

    const todaySalesTotal = todaySales.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
    const todaySalesQty = todaySales.reduce((sum, s) => sum + Number(s.quantity || 0), 0);
    const todaySalesCOGS = todaySales.reduce(
      (sum, s) => sum + (Number(s.costPriceSnapshot || 0) * Number(s.quantity || 0)),
      0
    );
    const todayGrossProfit = todaySalesTotal - todaySalesCOGS;

    const todayPurchasesTotal = todayPurchases.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);
    const todayPurchasesQty = todayPurchases.reduce((sum, p) => sum + Number(p.quantity || 0), 0);

    res.status(200).json({
      success: true,
      stats: {
        totalProducts: allProducts.length,
        totalStockUnits,
        totalInventoryValue,
        totalInventoryCost,
        lowStockCount: lowStockItems.length,
        lowStockItems: lowStockItems.slice(0, 6).map((s) => ({
          id: s.product?.id,
          _id: s.product?.id,
          name: s.product?.name,
          category: s.product?.category,
          unit: s.product?.unit,
          currentQuantity: Number(s.currentQuantity),
          reorderThreshold: Number(s.reorderThreshold)
        })),
        nearExpiryCount: nearExpiryBatches.length,
        nearExpiryBatches: nearExpiryBatches.slice(0, 6).map((b) => ({
          id: b.id,
          _id: b.id,
          batchNumber: b.batchNumber,
          productName: b.product?.name,
          unit: b.product?.unit,
          quantity: Number(b.quantity),
          expiryDate: b.expiryDate
        })),
        expiredCount: expiredBatches.length,
        today: {
          salesAmount: todaySalesTotal,
          salesQuantity: todaySalesQty,
          grossProfit: todayGrossProfit,
          purchasesAmount: todayPurchasesTotal,
          purchasesQuantity: todayPurchasesQty
        },
        recentActivity: {
          sales: recentSales.map((s) => {
            const j = s.toJSON();
            j._id = j.id;
            if (j.product) {
              j.product._id = j.product.id;
              j.productId = j.product;
            }
            return j;
          }),
          purchases: recentPurchases.map((p) => {
            const j = p.toJSON();
            j._id = j.id;
            if (j.product) {
              j.product._id = j.product.id;
              j.productId = j.product;
            }
            return j;
          })
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/reports/analytics
// @desc    Get detailed financial & stock reports filterable by date range and product
// @access  Private
export const getAnalyticsReport = async (req, res) => {
  try {
    const { range, startDate, endDate, productId } = req.query;
    let start = new Date();
    let end = new Date();

    if (range === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (range === 'week') {
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (range === 'month') {
      start.setMonth(start.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
    } else if (range === 'year') {
      start.setFullYear(start.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
    } else if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    }

    const dateFilter = { [Op.gte]: start, [Op.lte]: end };
    const purchaseWhere = { date: dateFilter };
    const saleWhere = { date: dateFilter };
    const prodWhere = { batchDate: dateFilter };

    if (productId && productId !== 'all') {
      purchaseWhere.productId = productId;
      saleWhere.productId = productId;
    }

    const [purchases, sales, productions, discardedBatches] = await Promise.all([
      Purchase.findAll({
        where: purchaseWhere,
        include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'category', 'unit', 'unitPrice', 'costPrice'] }]
      }),
      Sale.findAll({
        where: saleWhere,
        include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'category', 'unit', 'unitPrice', 'costPrice'] }]
      }),
      Production.findAll({
        where: prodWhere,
        include: [{ model: ProductionOutput, as: 'outputProducts' }]
      }),
      ExpiryBatch.findAll({
        where: { status: 'discarded', updatedAt: dateFilter },
        include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'unit', 'costPrice'] }]
      })
    ]);

    const totalSalesAmount = sales.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
    const totalSalesQuantity = sales.reduce((sum, s) => sum + Number(s.quantity || 0), 0);
    const totalCOGS = sales.reduce(
      (sum, s) => sum + (Number(s.costPriceSnapshot || s.product?.costPrice || 0) * Number(s.quantity || 0)),
      0
    );
    const grossProfit = totalSalesAmount - totalCOGS;

    const totalPurchasesAmount = purchases.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);
    const totalPurchasesQuantity = purchases.reduce((sum, p) => sum + Number(p.quantity || 0), 0);

    const batchWastageLoss = discardedBatches.reduce(
      (sum, b) => sum + (Number(b.quantity || 0) * Number(b.product?.costPrice || 0)),
      0
    );
    const totalWastageUnits = discardedBatches.reduce((sum, b) => sum + Number(b.quantity || 0), 0);
    const productionWastageLitres = productions.reduce((sum, p) => sum + Number(p.inputQuantity || 0), 0);

    const netProfit = grossProfit - batchWastageLoss;
    const profitMarginPct = totalSalesAmount > 0 ? Number(((netProfit / totalSalesAmount) * 100).toFixed(1)) : 0;

    // Build Daily Time Series Chart Data
    const daysMap = new Map();
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateKey = currentDate.toISOString().split('T')[0];
      daysMap.set(dateKey, { date: dateKey, sales: 0, purchases: 0, profit: 0 });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    sales.forEach((s) => {
      const itemDate = s.date || s.createdAt;
      const key = itemDate ? new Date(itemDate).toISOString().split('T')[0] : '';
      if (daysMap.has(key)) {
        const item = daysMap.get(key);
        item.sales += Number(s.totalAmount || 0);
        const cogs = Number(s.costPriceSnapshot || s.product?.costPrice || 0) * Number(s.quantity || 0);
        item.profit += (Number(s.totalAmount || 0) - cogs);
      }
    });

    purchases.forEach((p) => {
      const itemDate = p.date || p.createdAt;
      const key = itemDate ? new Date(itemDate).toISOString().split('T')[0] : '';
      if (daysMap.has(key)) {
        const item = daysMap.get(key);
        item.purchases += Number(p.totalAmount || 0);
      }
    });

    const timeSeries = Array.from(daysMap.values());


    // Category distribution
    const allProductsList = await Product.findAll();
    const productLookup = new Map(allProductsList.map(p => [p.id, p]));

    const categoryMap = new Map();
    sales.forEach((s) => {
      const prod = s.product || productLookup.get(s.productId);
      const cat = prod?.category || 'other';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + Number(s.totalAmount || 0));
    });

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, amount]) => ({
      category,
      amount
    }));


    const productSalesMap = new Map();
    sales.forEach((s) => {
      const prod = s.product || productLookup.get(s.productId);
      if (prod) {
        const pId = prod.id;
        const cur = productSalesMap.get(pId) || { 
          id: prod.id, 
          name: prod.name, 
          category: prod.category, 
          unit: prod.unit, 
          unitPrice: prod.unitPrice,
          totalQty: 0, 
          totalAmount: 0 
        };
        cur.totalQty += Number(s.quantity || 0);
        cur.totalAmount += Number(s.totalAmount || 0);
        productSalesMap.set(pId, cur);
      }
    });

    const topSelling = Array.from(productSalesMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 8);

    res.status(200).json({
      success: true,
      summary: {
        totalSalesAmount,
        totalSalesQuantity,
        totalPurchasesAmount,
        totalPurchasesQuantity,
        totalCOGS,
        grossProfit,
        batchWastageLoss,
        totalWastageUnits,
        productionWastageLitres,
        netProfit,
        profitMarginPct,
        // Frontend compatibility aliases
        totalRevenue: totalSalesAmount,
        totalPurchases: totalPurchasesAmount,
        totalUnitsSold: totalSalesQuantity,
        profitMargin: profitMarginPct
      },
      timeSeries,
      categoryBreakdown,
      topSelling
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// @route   GET /api/reports/export-csv
// @desc    Download CSV reports for all data entities & blank templates
// @access  Private
export const exportReportCsv = async (req, res) => {
  try {
    const { type } = req.query; // 'products' | 'stock' | 'sales' | 'purchases' | 'expiry' | 'production' | 'template-products' | 'template-purchases' | 'template-sales'

    // Template 1: Products Import Template
    if (type === 'template-products') {
      let csv = 'Product Name,Category,Unit,Unit Price,Cost Price,QR Code,Shelf Life Days,Reorder Threshold,Description\n';
      csv += '"Mother Dairy Cow Ghee 1L","ghee","tin",680,540,"MD-GHEE-COW-1L",180,10,"Pure Cow Ghee Tin"\n';
      csv += '"Mother Dairy Malai Paneer 200g","paneer","packet",95,75,"MD-PANEER-MALAI-200G",15,20,"Fresh Malai Paneer"\n';
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=products_import_template.csv');
      return res.send(csv);
    }

    // Template 2: Purchases Import Template
    if (type === 'template-purchases') {
      let csv = 'Product ID or Name,Quantity,Cost Price,Supplier Name,Invoice Number,Date,Expiry Date,Batch Number\n';
      csv += '"Mother Dairy Full Cream Milk (1L)",100,54,"Mother Dairy Central Plant","INV-9901","2026-08-25","2026-08-27","BCH-MIL-001"\n';
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=purchases_import_template.csv');
      return res.send(csv);
    }

    // Template 3: Sales Import Template
    if (type === 'template-sales') {
      let csv = 'Product ID or Name,Quantity,Selling Price,Customer Name,Payment Mode,Date,Outlet or Route\n';
      csv += '"Mother Dairy Full Cream Milk (1L)",5,68,"Counter Walkin","Cash","2026-08-25","Main Counter POS"\n';
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=sales_import_template.csv');
      return res.send(csv);
    }

    // Export: Products Catalog
    if (type === 'products') {
      const products = await Product.findAll({ order: [['name', 'ASC']] });
      let csv = 'ID,Product Name,Category,Unit,Selling Price (INR),Cost Price (INR),QR Code,Shelf Life (Days),Reorder Threshold,Status\n';
      products.forEach((p) => {
        csv += `"${p.id}","${p.name}","${p.category}","${p.unit}",${p.unitPrice},${p.costPrice},"${p.qrCode}",${p.shelfLifeDays},${p.reorderThreshold},"${p.isActive ? 'Active' : 'Inactive'}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=mother_dairy_products_catalog.csv');
      return res.send(csv);
    }

    // Export: Sales History
    if (type === 'sales') {
      const sales = await Sale.findAll({
        include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'category', 'unit'] }],
        order: [['date', 'DESC']]
      });
      let csv = 'Sale ID,Date,Product Name,Category,Quantity,Unit,Selling Price,Total Amount,Customer Name,Payment Mode,Route / POS\n';
      sales.forEach((s) => {
        csv += `"${s.id}","${new Date(s.date).toISOString().split('T')[0]}","${s.product?.name || ''}","${s.product?.category || ''}",${s.quantity},"${s.product?.unit || ''}",${s.sellingPrice},${s.totalAmount},"${s.customerName}","${s.paymentMode}","${s.outletOrRoute}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=mother_dairy_sales_report.csv');
      return res.send(csv);
    }

    // Export: Purchases Inward
    if (type === 'purchases') {
      const purchases = await Purchase.findAll({
        include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'category', 'unit'] }],
        order: [['date', 'DESC']]
      });
      let csv = 'Purchase ID,Date,Product Name,Category,Quantity,Unit,Cost Price,Total Amount,Supplier Name,Invoice Number\n';
      purchases.forEach((p) => {
        csv += `"${p.id}","${new Date(p.date).toISOString().split('T')[0]}","${p.product?.name || ''}","${p.product?.category || ''}",${p.quantity},"${p.product?.unit || ''}",${p.costPrice},${p.totalAmount},"${p.supplierName}","${p.invoiceNumber}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=mother_dairy_purchases_report.csv');
      return res.send(csv);
    }

    // Export: Expiry Batches
    if (type === 'expiry') {
      const batches = await ExpiryBatch.findAll({
        include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'category', 'unit'] }],
        order: [['expiryDate', 'ASC']]
      });
      let csv = 'Batch ID,Batch Number,Product Name,Category,Quantity,Unit,Manufacture Date,Expiry Date,Status,Notes\n';
      batches.forEach((b) => {
        csv += `"${b.id}","${b.batchNumber}","${b.product?.name || ''}","${b.product?.category || ''}",${b.quantity},"${b.product?.unit || ''}","${new Date(b.manufactureDate).toISOString().split('T')[0]}","${new Date(b.expiryDate).toISOString().split('T')[0]}","${b.status}","${b.notes || ''}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=mother_dairy_expiry_batches_report.csv');
      return res.send(csv);
    }

    // Export: Production Processing
    if (type === 'production') {
      const productions = await Production.findAll({
        include: [
          { model: Product, as: 'rawMilkProduct', attributes: ['name', 'unit'] },
          { model: ProductionOutput, as: 'outputProducts', include: [{ model: Product, as: 'product', attributes: ['name', 'unit'] }] }
        ],
        order: [['batchDate', 'DESC']]
      });
      let csv = 'Production ID,Batch Date,Raw Milk Processed (L),Outputs Generated,Wastage (L),Notes\n';
      productions.forEach((p) => {
        const outputs = (p.outputProducts || []).map((o) => `${o.product?.name || 'Item'}: ${o.quantity} ${o.product?.unit || 'units'}`).join('; ');
        csv += `"${p.id}","${new Date(p.batchDate).toISOString().split('T')[0]}",${p.inputQuantity},"${outputs}",${p.wastage},"${p.notes || ''}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=mother_dairy_production_log.csv');
      return res.send(csv);
    }

    // Default: Stock Valuation CSV
    const stocks = await Stock.findAll({
      include: [{ model: Product, as: 'product' }],
      order: [['currentQuantity', 'ASC']]
    });
    let csv = 'Product ID,QR Code,Product Name,Category,Unit,Current Quantity,Reorder Threshold,Unit Price (INR),Cost Price (INR),Total Stock Valuation (INR),Stock Status\n';
    stocks.forEach((s) => {
      if (s.product) {
        const isLow = Number(s.currentQuantity) <= Number(s.reorderThreshold);
        const totalVal = Number(s.currentQuantity) * Number(s.product.unitPrice || 0);
        csv += `"${s.product.id}","${s.product.qrCode}","${s.product.name}","${s.product.category}","${s.product.unit}",${s.currentQuantity},${s.reorderThreshold},${s.product.unitPrice},${s.product.costPrice || 0},${totalVal},"${isLow ? 'LOW STOCK' : 'HEALTHY'}"\n`;
      }
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=mother_dairy_stock_valuation_report.csv');
    return res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   POST /api/reports/bulk-import
// @desc    Bulk upload and import products, purchases, sales, or batches
// @access  Private/Admin
export const bulkImportData = async (req, res) => {
  try {
    const { type, records } = req.body;
    const userId = req.user.id || req.user._id;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid records provided for import.' });
    }

    let successCount = 0;
    const errors = [];

    // --- Bulk Import: Products ---
    if (type === 'products') {
      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        try {
          const name = row.name || row['Product Name'] || row.productName;
          const category = (row.category || row.Category || 'other').toLowerCase();
          const unit = (row.unit || row.Unit || 'packet').toLowerCase();
          const unitPrice = Number(row.unitPrice || row['Unit Price'] || row.price || 0);
          const costPrice = Number(row.costPrice || row['Cost Price'] || Math.round(unitPrice * 0.8));
          const qrCode = row.qrCode || row['QR Code'] || `MD-${category.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-4)}${i}`;
          const shelfLifeDays = Number(row.shelfLifeDays || row['Shelf Life Days'] || 3);
          const reorderThreshold = Number(row.reorderThreshold || row['Reorder Threshold'] || 20);
          const initialQuantity = Number(row.initialQuantity || row.quantity || 0);

          if (!name || isNaN(unitPrice)) {
            errors.push(`Row ${i + 1}: Name and Unit Price are required.`);
            continue;
          }

          const [product, created] = await Product.findOrCreate({
            where: { [Op.or]: [{ qrCode }, { name }] },
            defaults: {
              name,
              category,
              unit,
              unitPrice,
              costPrice,
              qrCode,
              shelfLifeDays,
              reorderThreshold,
              isActive: true
            }
          });

          // Stock creation
          let stock = await Stock.findOne({ where: { productId: product.id } });
          if (!stock) {
            await Stock.create({
              productId: product.id,
              currentQuantity: initialQuantity,
              reorderThreshold,
              lastUpdated: new Date()
            });
          } else if (initialQuantity > 0) {
            stock.currentQuantity = Number(stock.currentQuantity || 0) + initialQuantity;
            await stock.save();
          }

          successCount++;
        } catch (err) {
          errors.push(`Row ${i + 1}: ${err.message}`);
        }
      }
    }

    // --- Bulk Import: Purchases ---
    else if (type === 'purchases') {
      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        try {
          const prodIdentifier = row.productId || row.product || row['Product ID or Name'] || row.name;
          const qty = Number(row.quantity || row.Quantity || 0);
          const cost = Number(row.costPrice || row['Cost Price'] || 0);
          const supplier = row.supplierName || row['Supplier Name'] || row.supplier || 'Bulk Supplier';
          const invoice = row.invoiceNumber || row['Invoice Number'] || `BULK-INV-${Date.now().toString().slice(-4)}${i}`;
          const pDate = row.date || row.Date ? new Date(row.date || row.Date) : new Date();

          if (!prodIdentifier || qty <= 0) {
            errors.push(`Row ${i + 1}: Product and valid Quantity required.`);
            continue;
          }

          let product = null;
          if (!isNaN(prodIdentifier)) {
            product = await Product.findByPk(prodIdentifier);
          }
          if (!product) {
            product = await Product.findOne({ where: { name: { [Op.like]: `%${prodIdentifier}%` } } });
          }

          if (!product) {
            errors.push(`Row ${i + 1}: Product "${prodIdentifier}" not found.`);
            continue;
          }

          const total = Number((qty * cost).toFixed(2));
          await Purchase.create({
            productId: product.id,
            quantity: qty,
            costPrice: cost,
            totalAmount: total,
            supplierName: supplier,
            invoiceNumber: invoice,
            date: pDate,
            addedBy: userId
          });

          await addStock(product.id, qty);
          successCount++;
        } catch (err) {
          errors.push(`Row ${i + 1}: ${err.message}`);
        }
      }
    }

    // --- Bulk Import: Sales ---
    else if (type === 'sales') {
      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        try {
          const prodIdentifier = row.productId || row.product || row['Product ID or Name'] || row.name;
          const qty = Number(row.quantity || row.Quantity || 0);
          const price = Number(row.sellingPrice || row['Selling Price'] || 0);
          const customer = row.customerName || row['Customer Name'] || 'Bulk POS Customer';
          const mode = row.paymentMode || row['Payment Mode'] || 'Cash';
          const sDate = row.date || row.Date ? new Date(row.date || row.Date) : new Date();

          if (!prodIdentifier || qty <= 0) {
            errors.push(`Row ${i + 1}: Product and valid Quantity required.`);
            continue;
          }

          let product = null;
          if (!isNaN(prodIdentifier)) {
            product = await Product.findByPk(prodIdentifier);
          }
          if (!product) {
            product = await Product.findOne({ where: { name: { [Op.like]: `%${prodIdentifier}%` } } });
          }

          if (!product) {
            errors.push(`Row ${i + 1}: Product "${prodIdentifier}" not found.`);
            continue;
          }

          await subtractStock(product.id, qty);
          const total = Number((qty * (price || product.unitPrice)).toFixed(2));

          await Sale.create({
            productId: product.id,
            quantity: qty,
            sellingPrice: price || product.unitPrice,
            costPriceSnapshot: product.costPrice || 0,
            totalAmount: total,
            customerName: customer,
            paymentMode: ['Cash', 'UPI', 'Card', 'Credit'].includes(mode) ? mode : 'Cash',
            date: sDate,
            addedBy: userId
          });

          successCount++;
        } catch (err) {
          errors.push(`Row ${i + 1}: ${err.message}`);
        }
      }
    } else {
      return res.status(400).json({ success: false, message: `Unsupported import type: ${type}` });
    }

    await logAudit({
      req,
      action: 'BULK_IMPORT',
      entityType: type,
      details: `Bulk imported ${successCount} ${type} records. Errors: ${errors.length}`
    });

    res.status(200).json({
      success: true,
      message: `Successfully imported ${successCount} ${type} records!`,
      successCount,
      failedCount: errors.length,
      errors: errors.slice(0, 10)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
