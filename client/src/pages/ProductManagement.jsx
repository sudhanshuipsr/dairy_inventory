import React, { useState, useEffect, useMemo } from 'react';
import { 
  getProductsApi, 
  createProductApi, 
  updateProductApi, 
  deleteProductApi 
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/common/Modal';
import QrGeneratorModal from '../components/common/QrGeneratorModal';
import Badge from '../components/common/Badge';
import { 
  Package, 
  Plus, 
  Edit3, 
  Trash2, 
  QrCode, 
  Search, 
  Printer, 
  RefreshCw, 
  Layers 
} from 'lucide-react';

import { 
  DAIRY_CATEGORIES, 
  PRODUCT_CATEGORIES, 
  MEASUREMENT_UNITS, 
  getCategoryMeta 
} from '../utils/categories';

const ProductManagement = () => {
  const { isAdmin } = useAuth();
  const { addToast } = useToast();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedProductForQr, setSelectedProductForQr] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: 'milk',
    unit: 'packet',
    unitPrice: 50,
    costPrice: 40,
    qrCode: '',
    barcode: '',
    description: '',
    shelfLifeDays: 3,
    reorderThreshold: 20
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await getProductsApi();
      if (res.data?.success && Array.isArray(res.data.products)) {
        setProducts(res.data.products);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.warn('Product load fallback active:', error?.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };


  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      name: '',
      category: 'milk',
      unit: 'packet',
      unitPrice: 50,
      costPrice: 40,
      qrCode: `DAIRY-MLK-${Date.now().toString().slice(-4)}`,
      barcode: '',
      description: '',
      shelfLifeDays: 3,
      reorderThreshold: 20
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product) => {
    setIsEditing(true);
    setEditingId(product._id);
    setFormData({
      name: product.name,
      category: product.category,
      unit: product.unit,
      unitPrice: product.unitPrice,
      costPrice: product.costPrice || Math.round(product.unitPrice * 0.8),
      qrCode: product.qrCode,
      barcode: product.barcode || '',
      description: product.description || '',
      shelfLifeDays: product.shelfLifeDays || 3,
      reorderThreshold: product.reorderThreshold || 20
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (isEditing) {
        const res = await updateProductApi(editingId, formData);
        if (res.data.success) {
          addToast(res.data.message, 'success');
          setIsModalOpen(false);
          fetchProducts();
        }
      } else {
        const res = await createProductApi(formData);
        if (res.data.success) {
          addToast(res.data.message, 'success');
          setIsModalOpen(false);
          fetchProducts();
        }
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to save product', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Permanently delete product "${name}" and its stock records?`)) return;

    try {
      const res = await deleteProductApi(id);
      if (res.data.success) {
        addToast(res.data.message, 'info');
        fetchProducts();
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to delete product', 'error');
    }
  };

  const filteredProducts = (products || []).filter((p) => {
    if (!p) return false;
    const matchesCat = categoryFilter === 'All' || p.category === categoryFilter;
    const matchesQuery = 
      (p.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      (p.qrCode || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      (p.category || '').toLowerCase().includes((searchQuery || '').toLowerCase());
    return matchesCat && matchesQuery;
  });

  const displayedCategories = useMemo(() => {
    const presentCats = new Set((products || []).map(p => p.category).filter(Boolean));
    if (presentCats.size === 0) {
      return [{ id: 'All', label: 'All Categories', icon: '🥛' }];
    }
    return DAIRY_CATEGORIES.filter(c => c.id === 'All' || presentCats.has(c.id));
  }, [products]);


  return (
    <div className="space-y-6">
      {/* 1. Header & Create Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-[#0B4F9C]" />
            <span>Product Catalog & QR Generator</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage dairy product master records, prices, shelf-life days, and print QR stickers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-[#0B4F9C] hover:bg-[#083D7A] text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Product</span>
            </button>
          )}

          <button
            onClick={fetchProducts}
            className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-colors"
            title="Refresh products"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Filter & Search Controls */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search product name or QR code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {displayedCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  categoryFilter === cat.id
                    ? 'bg-[#0B4F9C] text-white shadow-xs font-black'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.id === 'All' ? 'All' : cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Product Catalog Grid */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 animate-pulse">
          Loading product catalog...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-2">
          <Package className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-extrabold text-sm text-slate-700">No Products Found</h3>
          <p className="text-xs text-slate-400">Add a new dairy product to start tracking inventory.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredProducts.map((product) => {
            const catMeta = getCategoryMeta(product.category);
            return (
              <div
                key={product._id}
                className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-soft hover:shadow-lg transition-all space-y-3.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-[#0B4F9C] bg-blue-50 px-2.5 py-0.5 rounded-full text-[11px] border border-blue-100 flex items-center gap-1">
                        <span>{catMeta.icon}</span>
                        <span>{catMeta.label || product.category}</span>
                      </span>
                      {product.isLowStock && (
                        <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-[10px] border border-amber-200 flex items-center gap-1 animate-pulse">
                          <span>⚠️ Low Stock</span>
                        </span>
                      )}
                    </div>

                  {/* QR Print Trigger */}
                  <button
                    onClick={() => setSelectedProductForQr(product)}
                    className="p-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-[#0B4F9C] rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                    title="Generate & print QR sticker"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span className="text-[10px]">QR Code</span>
                  </button>
                </div>

                <h3 className="font-black text-sm text-slate-900 mt-2 leading-tight">
                  {product.name}
                </h3>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5 flex-wrap">
                  <span>QR: <strong className="text-dairy-blue">{product.qrCode}</strong></span>
                  {product.barcode && (
                    <span className="text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">
                      BAR: {product.barcode}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Current Stock</span>
                    <span className={`font-black text-sm ${product.isLowStock ? 'text-amber-600' : 'text-slate-900'}`}>
                      {product.currentQuantity ?? 0} {product.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Reorder Buffer</span>
                    <span className="font-bold text-slate-700">{product.reorderThreshold || 20} {product.unit}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Selling Price</span>
                    <span className="font-black text-slate-900 text-sm">₹{product.unitPrice} / {product.unit}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Cost Price</span>
                    <span className="font-bold text-slate-600 text-sm">₹{product.costPrice || 0}</span>
                  </div>
                </div>
              </div>

              {/* Admin Actions */}
              {isAdmin && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleOpenEditModal(product)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleDeleteProduct(product._id, product.name)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Delete product"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              </div>
            );
          })}
        </div>
      )}


      {/* 4. Product Modal (Create / Edit) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Edit Dairy Product' : 'Create New Dairy Product'}
        subtitle="Configure product details, measurement unit, default pricing, and QR identifier."
        icon={<Package className="w-5 h-5 text-[#0B4F9C]" />}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Product Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Pure Cow Ghee (1 Litre)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => {
                  const cat = e.target.value;
                  setFormData({
                    ...formData,
                    category: cat,
                    qrCode: `DAIRY-${cat.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-4)}`
                  });
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
              >
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Measurement Unit
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
              >
                {MEASUREMENT_UNITS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Selling Price (₹)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Cost Price (₹)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Shelf Life (Days)
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.shelfLifeDays}
                onChange={(e) => setFormData({ ...formData, shelfLifeDays: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reorder Threshold
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.reorderThreshold}
                onChange={(e) => setFormData({ ...formData, reorderThreshold: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                QR Code Identifier
              </label>
              <input
                type="text"
                required
                value={formData.qrCode}
                onChange={(e) => setFormData({ ...formData, qrCode: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Barcode (EAN-13 / 1D)
              </label>
              <input
                type="text"
                placeholder="e.g. 8901648001018"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-[#0B4F9C] hover:bg-[#083D7A] disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md transition-colors"
            >
              {submitting ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 5. Printable QR Code Generator Modal */}
      <QrGeneratorModal
        isOpen={!!selectedProductForQr}
        onClose={() => setSelectedProductForQr(null)}
        product={selectedProductForQr}
      />
    </div>
  );
};

export default ProductManagement;
