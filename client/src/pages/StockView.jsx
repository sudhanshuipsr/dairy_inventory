import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  getStockLevelsApi, 
  updateReorderThresholdApi,
  quickStockInwardApi
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { 
  Boxes, 
  Search, 
  AlertTriangle, 
  Plus, 
  ShoppingCart, 
  Edit3, 
  RefreshCw, 
  Filter, 
  ArrowUpRight, 
  ShieldAlert,
  Calendar,
  Layers,
  Package,
  CheckCircle2,
  AlertCircle,
  Truck,
  DollarSign,
  FileText,
  Tag,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { DAIRY_CATEGORIES, getCategoryMeta } from '../utils/categories';

const StockView = () => {
  const [stocks, setStocks] = useState([]);
  const [summary, setSummary] = useState({
    totalProducts: 0,
    totalQuantity: 0,
    lowStockCount: 0,
    expiringBatchesCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  const [searchParams, setSearchParams] = useSearchParams();
  const lowStockFilter = searchParams.get('lowStockOnly') === 'true';

  const { addToast } = useToast();
  const { isAdmin } = useAuth();

  // Threshold modal state
  const [selectedStockForThreshold, setSelectedStockForThreshold] = useState(null);
  const [newThreshold, setNewThreshold] = useState(20);
  const [savingThreshold, setSavingThreshold] = useState(false);

  // Stock Entry Modal State
  const [isStockEntryOpen, setIsStockEntryOpen] = useState(false);
  const [submittingInward, setSubmittingInward] = useState(false);
  const [matchedProduct, setMatchedProduct] = useState(null);

  const quantityInputRef = useRef(null);

  // Stock Inward Form State
  const [entryForm, setEntryForm] = useState({
    productId: '',
    productName: '',
    category: 'milk',
    unit: 'litre',
    quantity: 10,
    costPrice: 28,
    unitPrice: 34,
    expiryDate: '',
    batchNumber: '',
    supplierName: 'Mother Dairy Plant / Direct',
    invoiceNumber: '',
    notes: ''
  });

  useEffect(() => {
    fetchStockLevels();

    const handleStockUpdated = () => {
      fetchStockLevels();
    };

    window.addEventListener('stock-updated', handleStockUpdated);
    return () => window.removeEventListener('stock-updated', handleStockUpdated);
  }, [lowStockFilter]);

  const fetchStockLevels = async () => {
    try {
      setLoading(true);
      const res = await getStockLevelsApi({ lowStockOnly: lowStockFilter });
      if (res.data?.success && Array.isArray(res.data.stocks)) {
        setStocks(res.data.stocks);
        setSummary(res.data.summary || {
          totalProducts: res.data.stocks.length,
          totalQuantity: res.data.stocks.reduce((acc, s) => acc + (s.quantity || 0), 0),
          lowStockCount: 0,
          expiringBatchesCount: 0
        });
      } else {
        setStocks([]);
        setSummary({
          totalProducts: 0,
          totalQuantity: 0,
          lowStockCount: 0,
          expiringBatchesCount: 0
        });
      }
    } catch (error) {
      console.warn('Stock load error:', error?.message);
      setStocks([]);
      setSummary({
        totalProducts: 0,
        totalQuantity: 0,
        lowStockCount: 0,
        expiringBatchesCount: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Threshold update
  const handleOpenThresholdModal = (stock) => {
    setSelectedStockForThreshold(stock);
    setNewThreshold(stock.reorderThreshold || 20);
  };

  const handleSaveThreshold = async (e) => {
    e.preventDefault();
    if (!selectedStockForThreshold) return;

    try {
      setSavingThreshold(true);
      const prodId = selectedStockForThreshold.productId?._id || selectedStockForThreshold.productId?.id || selectedStockForThreshold.productId;
      const res = await updateReorderThresholdApi(
        prodId,
        { reorderThreshold: Number(newThreshold) }
      );
      if (res.data.success) {
        addToast(`Reorder threshold set to ${newThreshold} for ${selectedStockForThreshold.productId?.name || 'Product'}`, 'success');
        setSelectedStockForThreshold(null);
        fetchStockLevels();
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to update threshold', 'error');
    } finally {
      setSavingThreshold(false);
    }
  };

  // Open empty Stock Entry Form
  const handleOpenStockEntry = () => {
    const today = new Date();
    const defaultExp = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setMatchedProduct(null);
    setEntryForm({
      productId: '',
      productName: '',
      category: 'milk',
      unit: 'litre',
      quantity: 10,
      costPrice: 28,
      unitPrice: 34,
      expiryDate: defaultExp,
      batchNumber: `BCH-MD-${Date.now().toString().slice(-5)}`,
      supplierName: 'Mother Dairy Plant / Direct',
      invoiceNumber: '',
      notes: ''
    });
    setIsStockEntryOpen(true);
  };

  // Submit Stock Inward
  const handleSubmitStockEntry = async (e) => {
    e.preventDefault();

    const numQty = Number(entryForm.quantity);
    if (!numQty || numQty <= 0) {
      addToast('Please enter a valid quantity greater than 0', 'warning');
      return;
    }

    if (!entryForm.productName.trim()) {
      addToast('Product name is required', 'warning');
      return;
    }

    try {
      setSubmittingInward(true);

      const payload = {
        productId: entryForm.productId || undefined,
        productName: entryForm.productName.trim(),
        name: entryForm.productName.trim(),
        category: entryForm.category,
        unit: entryForm.unit,
        quantity: numQty,
        costPrice: Number(entryForm.costPrice || 0),
        unitPrice: Number(entryForm.unitPrice || 0),
        expiryDate: entryForm.expiryDate,
        batchNumber: entryForm.batchNumber || `BCH-${Date.now().toString().slice(-6)}`,
        supplierName: entryForm.supplierName || 'Plant Direct',
        invoiceNumber: entryForm.invoiceNumber,
        notes: entryForm.notes
      };

      const res = await quickStockInwardApi(payload);

      addToast(`+${numQty} ${entryForm.unit} added to ${entryForm.productName}!`, 'success');
      setIsStockEntryOpen(false);
      fetchStockLevels();
    } catch (err) {
      console.error('Stock inward error:', err);
      addToast(err.response?.data?.message || 'Failed to record stock inward', 'error');
    } finally {
      setSubmittingInward(false);
    }
  };

  const displayedCategories = useMemo(() => {
    const presentCats = new Set((stocks || []).map(s => s?.productId?.category || s?.product?.category).filter(Boolean));
    if (presentCats.size === 0) {
      return [{ id: 'All', label: 'All Categories', icon: '🥛' }];
    }
    return DAIRY_CATEGORIES.filter(c => c.id === 'All' || presentCats.has(c.id));
  }, [stocks]);

  // Filtered in-memory for immediate UI search
  const filteredStocks = (stocks || []).filter((s) => {
    const product = s?.productId || s?.product;
    if (!product) return false;

    const matchesCategory = categoryFilter === 'All' || product.category === categoryFilter;
    const matchesSearch = 
      (product.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      (product.qrCode || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      (product.category || '').toLowerCase().includes((searchQuery || '').toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header with Stats & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-[#0B4F9C]" />
            <span>Live Stock Inventory</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Current on-hand inventory balances auto-updated via Purchases and Sales.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Manual Stock Entry Modal Button */}
          <button
            onClick={handleOpenStockEntry}
            className="px-4 py-2.5 bg-[#0B4F9C] hover:bg-[#083D7A] text-white rounded-xl text-xs font-bold shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
            title="Open stock inward form"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Stock Inward</span>
          </button>

          <button
            onClick={fetchStockLevels}
            className="p-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-colors shadow-2xs"
            title="Refresh stocks"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0B4F9C]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Strip */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Quantity</span>
            <div className="text-xl font-black text-[#0B4F9C] mt-0.5">{summary.totalQuantity} Units</div>
            <span className="text-[10px] text-slate-500">{summary.totalProducts} Catalog Products</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Stock Valuation</span>
            <div className="text-xl font-black text-emerald-700 mt-0.5">
              ₹{(summary.totalValue || 0).toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-500">Retail Sales Value</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Low Stock Alerts</span>
            <div className={`text-xl font-black mt-0.5 ${summary.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              {summary.lowStockCount} Items
            </div>
            <span className="text-[10px] text-slate-500">Below Reorder Level</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Out of Stock</span>
            <div className={`text-xl font-black mt-0.5 ${summary.outOfStockCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {summary.outOfStockCount || 0} Items
            </div>
            <span className="text-[10px] text-slate-500">Zero On-Hand Balance</span>
          </div>
        </div>
      )}

      {/* 3. Search, Category Filter & Low Stock Banner */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by product name, SKU, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C] shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {displayedCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  categoryFilter === cat.id
                    ? 'bg-[#0B4F9C] text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {lowStockFilter && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Filtering by Low Stock Items Only</span>
            </div>
            <button
              onClick={() => setSearchParams({})}
              className="text-xs text-amber-900 underline font-semibold hover:text-amber-700"
            >
              Clear Filter
            </button>
          </div>
        )}
      </div>

      {/* 4. Products Stock Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">On-Hand Stock</th>
                <th className="py-3 px-4">Unit Price</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0B4F9C]" />
                    <span>Loading live stock inventory...</span>
                  </td>
                </tr>
              ) : filteredStocks.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <Boxes className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-600">No stock records found</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try changing your search filter or add stock.</p>
                  </td>
                </tr>
              ) : (
                filteredStocks.map((stock) => {
                  const product = stock?.productId || stock?.product;
                  if (!product) return null;
                  const catMeta = getCategoryMeta(product.category);
                  const isLow = Number(stock.currentQuantity) <= Number(stock.reorderThreshold);
                  const isOut = Number(stock.currentQuantity) === 0;

                  return (
                    <tr key={stock.id || stock._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{product.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-slate-500">QR: {product.qrCode}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${catMeta.bgClass} ${catMeta.colorClass}`}>
                          <span>{catMeta.icon}</span>
                          <span>{catMeta.label}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-black text-sm text-slate-900">
                          {stock.currentQuantity} {product.unit}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Alert Threshold: {stock.reorderThreshold} {product.unit}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">₹{product.unitPrice}</div>
                        <div className="text-[10px] text-slate-400">Cost: ₹{product.costPrice || Math.round(product.unitPrice * 0.8)}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isOut ? (
                          <Badge variant="danger">Out of Stock</Badge>
                        ) : isLow ? (
                          <Badge variant="warning">Low Stock Alert</Badge>
                        ) : (
                          <Badge variant="success">Normal</Badge>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Inward for this product */}
                          <button
                            onClick={() => {
                              setMatchedProduct(product);
                              const shelfDays = Number(product.shelfLifeDays || 3);
                              const expDate = new Date(Date.now() + shelfDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                              const catCode = (product.category || 'MD').toUpperCase().slice(0, 3);
                              setEntryForm({
                                productId: product._id || product.id,
                                productName: product.name,
                                category: product.category || 'milk',
                                unit: product.unit || 'pack',
                                quantity: 10,
                                costPrice: product.costPrice || Math.round(Number(product.unitPrice || 40) * 0.8),
                                unitPrice: product.unitPrice || 40,
                                expiryDate: expDate,
                                batchNumber: `BCH-${catCode}-${Date.now().toString().slice(-5)}`,
                                supplierName: 'Mother Dairy Plant / Direct',
                                invoiceNumber: '',
                                notes: ''
                              });
                              setIsStockEntryOpen(true);
                            }}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold transition-colors"
                            title="Add stock for this product"
                          >
                            + Inward
                          </button>

                          {/* Reorder Threshold Editor */}
                          {isAdmin && (
                            <button
                              onClick={() => handleOpenThresholdModal(stock)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                              title="Set alert reorder threshold"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Stock Inward Entry Form Modal */}
      <Modal
        isOpen={isStockEntryOpen}
        onClose={() => setIsStockEntryOpen(false)}
        title="Stock Inward Entry"
        size="lg"
      >
        <form onSubmit={handleSubmitStockEntry} className="space-y-4">
          {/* Catalog Product Quick Selector */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-[#0B4F9C]" />
                <span>Select Catalog Product (Or enter new product below)</span>
              </label>
              {matchedProduct && (
                <button
                  type="button"
                  onClick={() => {
                    setMatchedProduct(null);
                    setEntryForm(prev => ({
                      ...prev,
                      productId: '',
                      productName: '',
                      costPrice: 28,
                      unitPrice: 34
                    }));
                  }}
                  className="text-[11px] text-[#0B4F9C] font-semibold hover:underline"
                >
                  Clear Selection
                </button>
              )}
            </div>

            <select
              value={entryForm.productId || ''}
              onChange={(e) => {
                const selectedId = e.target.value;
                if (!selectedId) {
                  setMatchedProduct(null);
                  return;
                }
                const found = stocks.find(s => {
                  const p = s.productId || s.product;
                  return (p?._id || p?.id) === selectedId;
                });
                const prod = found?.productId || found?.product;
                if (prod) {
                  setMatchedProduct(prod);
                  const shelfDays = Number(prod.shelfLifeDays || 3);
                  const expDate = new Date(Date.now() + shelfDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                  const catCode = (prod.category || 'MD').toUpperCase().slice(0, 3);
                  setEntryForm(prev => ({
                    ...prev,
                    productId: prod._id || prod.id,
                    productName: prod.name,
                    category: prod.category || 'milk',
                    unit: prod.unit || 'pack',
                    costPrice: prod.costPrice || Math.round(Number(prod.unitPrice || 40) * 0.8),
                    unitPrice: prod.unitPrice || 40,
                    expiryDate: expDate,
                    batchNumber: `BCH-${catCode}-${Date.now().toString().slice(-5)}`
                  }));
                  setTimeout(() => {
                    quantityInputRef.current?.focus();
                    quantityInputRef.current?.select();
                  }, 150);
                }
              }}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
            >
              <option value="">-- Choose Existing Product (Optional) --</option>
              {stocks.map(s => {
                const p = s.productId || s.product;
                if (!p) return null;
                const id = p._id || p.id;
                return (
                  <option key={id} value={id}>
                    {p.name} ({s.currentQuantity} in stock) - ₹{p.unitPrice}
                  </option>
                );
              })}
            </select>

            {/* Matched Product Found Preview Card */}
            {matchedProduct && (
              <div className="mt-2 p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900">{matchedProduct.name}</h4>
                    <p className="text-[10px] text-emerald-700">
                      Category: <span className="font-semibold">{matchedProduct.category}</span> • 
                      Current Stock: <span className="font-black">{matchedProduct.currentStock || matchedProduct.currentQuantity || 0} {matchedProduct.unit}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Unit Selling Price</span>
                  <span className="text-xs font-bold text-slate-900">₹{matchedProduct.unitPrice}</span>
                </div>
              </div>
            )}
          </div>

          {/* Product Details Section (editable for new products, read-only/verified for matched products) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={entryForm.productName}
                onChange={(e) => setEntryForm({ ...entryForm, productName: e.target.value })}
                placeholder="e.g. Mother Dairy Full Cream Milk (1L)"
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Category *
                </label>
                <select
                  value={entryForm.category}
                  onChange={(e) => setEntryForm({ ...entryForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
                >
                  {DAIRY_CATEGORIES.filter(c => c.id !== 'All').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Unit *
                </label>
                <select
                  value={entryForm.unit}
                  onChange={(e) => setEntryForm({ ...entryForm, unit: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
                >
                  <option value="litre">Litre (L)</option>
                  <option value="pack">Pack</option>
                  <option value="kg">Kilogram (kg)</option>
                  <option value="gram">Gram (g)</option>
                  <option value="piece">Piece</option>
                  <option value="bottle">Bottle</option>
                  <option value="cup">Cup</option>
                  <option value="tin">Tin</option>
                </select>
              </div>
            </div>
          </div>

          {/* Manual Entry Fields: Quantity & Expiry Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
            <div>
              <label className="text-[11px] font-black text-emerald-900 uppercase tracking-wider block mb-1 flex items-center justify-between">
                <span>Quantity to Add *</span>
                <span className="text-[10px] text-emerald-700 font-normal">Manually entered</span>
              </label>
              <div className="relative">
                <input
                  ref={quantityInputRef}
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={entryForm.quantity}
                  onChange={(e) => setEntryForm({ ...entryForm, quantity: e.target.value })}
                  placeholder="Enter quantity..."
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-emerald-500 rounded-xl text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-800">
                  {entryForm.unit}
                </span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-black text-emerald-900 uppercase tracking-wider block mb-1 flex items-center justify-between">
                <span>Expiry Date *</span>
                <span className="text-[10px] text-emerald-700 font-normal">Manually verified</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={entryForm.expiryDate}
                  onChange={(e) => setEntryForm({ ...entryForm, expiryDate: e.target.value })}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border-2 border-emerald-500 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Pricing & Batch Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Batch Number
              </label>
              <input
                type="text"
                value={entryForm.batchNumber}
                onChange={(e) => setEntryForm({ ...entryForm, batchNumber: e.target.value })}
                placeholder="e.g. BCH-MIL-10293"
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Cost Price (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={entryForm.costPrice}
                onChange={(e) => setEntryForm({ ...entryForm, costPrice: e.target.value })}
                placeholder="Purchase price per unit"
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Selling Price (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={entryForm.unitPrice}
                onChange={(e) => setEntryForm({ ...entryForm, unitPrice: e.target.value })}
                placeholder="Retail price per unit"
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
              />
            </div>
          </div>

          {/* Supplier & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Supplier / Source
              </label>
              <div className="relative">
                <Truck className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={entryForm.supplierName}
                  onChange={(e) => setEntryForm({ ...entryForm, supplierName: e.target.value })}
                  placeholder="e.g. Mother Dairy Plant Delivery"
                  className="w-full pl-8 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Invoice / Challan No.
              </label>
              <div className="relative">
                <FileText className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={entryForm.invoiceNumber}
                  onChange={(e) => setEntryForm({ ...entryForm, invoiceNumber: e.target.value })}
                  placeholder="e.g. INV-2026-0901"
                  className="w-full pl-8 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsStockEntryOpen(false)}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingInward || !entryForm.quantity}
              className="flex-2 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-1.5"
            >
              {submittingInward ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Adding to Stock...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Confirm Stock Inward (+{entryForm.quantity || 0} {entryForm.unit})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* 6. Threshold Modal */}
      <Modal
        isOpen={Boolean(selectedStockForThreshold)}
        onClose={() => setSelectedStockForThreshold(null)}
        title="Set Reorder Alert Threshold"
        size="sm"
      >
        <form onSubmit={handleSaveThreshold} className="space-y-4">
          <div>
            <div className="text-xs font-bold text-slate-800 mb-1">
              {selectedStockForThreshold?.productId?.name || 'Product'}
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Current stock on hand: <span className="font-bold text-slate-900">{selectedStockForThreshold?.currentQuantity}</span>
            </p>

            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Minimum Quantity Alert Trigger
            </label>
            <input
              type="number"
              min="1"
              required
              value={newThreshold}
              onChange={(e) => setNewThreshold(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              When current quantity drops to or below this count, a warning flag appears across dashboards and reports.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSelectedStockForThreshold(null)}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingThreshold}
              className="flex-1 py-2.5 bg-[#0B4F9C] hover:bg-[#083D7A] text-white rounded-xl text-xs font-black shadow-md transition-colors"
            >
              {savingThreshold ? 'Updating...' : 'Save Threshold'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StockView;
