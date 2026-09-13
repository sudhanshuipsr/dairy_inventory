import { Stock, Product } from '../models/index.js';

export const addStock = async (productId, quantity) => {
  const numQty = Number(quantity);
  if (isNaN(numQty) || numQty <= 0) return;

  const product = await Product.findByPk(productId);
  const threshold = product ? product.reorderThreshold : 20;

  let stock = await Stock.findOne({ where: { productId } });

  if (!stock) {
    stock = await Stock.create({
      productId,
      currentQuantity: numQty,
      reorderThreshold: threshold,
      lastUpdated: new Date()
    });
  } else {
    stock.currentQuantity = Number(stock.currentQuantity || 0) + numQty;
    stock.lastUpdated = new Date();
    await stock.save();
  }

  return stock;
};

export const subtractStock = async (productId, quantity) => {
  const numQty = Number(quantity);
  if (isNaN(numQty) || numQty <= 0) return;

  let stock = await Stock.findOne({ where: { productId } });
  const product = await Product.findByPk(productId);

  if (!stock) {
    throw new Error(
      `No stock available for "${product?.name || 'Product'}". Available: 0, Requested: ${numQty}. Please add stock first.`
    );
  }

  const current = Number(stock.currentQuantity || 0);
  if (current < numQty) {
    throw new Error(
      `Insufficient stock for "${product?.name || 'Product'}". Available: ${current}, Requested: ${numQty}`
    );
  }

  stock.currentQuantity = current - numQty;
  stock.lastUpdated = new Date();
  await stock.save();

  return stock;
};

export const syncAllStockLevels = async () => {
  const products = await Product.findAll();
  for (const product of products) {
    const exists = await Stock.findOne({ where: { productId: product.id } });
    if (!exists) {
      await Stock.create({
        productId: product.id,
        currentQuantity: 0,
        reorderThreshold: product.reorderThreshold || 20,
        lastUpdated: new Date()
      });
    }
  }
};
