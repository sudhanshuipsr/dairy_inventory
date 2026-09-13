import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getDashboardStatsApi, 
  getAnalyticsReportApi,
  getProductsApi,
  getSalesApi,
  getPurchasesApi,
  getExpiryBatchesApi
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/common/StatCard';
import Badge from '../components/common/Badge';
import { 
  Boxes, 
  ShoppingCart, 
  ShoppingBag, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  ArrowRight, 
  Plus, 
  Camera, 
  Factory, 
  RefreshCw, 
  CheckCircle2, 
  Calendar,
  Sparkles,
  ChevronRight,
  Search,
  X,
  PackageCheck,
  FileText,
  Truck,
  Zap,
  ExternalLink,
  SlidersHorizontal,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { 
  FALLBACK_DASHBOARD_KPI,
  FALLBACK_PRODUCTS,
  FALLBACK_SALES,
  FALLBACK_PURCHASES,
  FALLBACK_EXPIRY_BATCHES
} from '../utils/demoFallbackData';
import { DAIRY_CATEGORIES, getCategoryMeta } from '../utils/categories';

const COLORS = ['#1e3a1e', '#3d6b3d', '#6a9c6a', '#9bc09b', '#d97706', '#be123c', '#4c7a4c'];

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const searchInputRef = useRef(null);

  const [stats, setStats] = useState(FALLBACK_DASHBOARD_KPI.kpis);
  const [analytics, setAnalytics] = useState(FALLBACK_DASHBOARD_KPI);
  const [products, setProducts] = useState(FALLBACK_PRODUCTS);
  const [sales, setSales] = useState(FALLBACK_SALES);
  const [purchases, setPurchases] = useState(FALLBACK_PURCHASES);
  const [batches, setBatches] = useState(FALLBACK_EXPIRY_BATCHES);
  const [loading, setLoading] = useState(false);

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('all'); // all, products, sales, purchases, batches
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Dashboard Live Products Table Category Filter
  const [stockCategoryFilter, setStockCategoryFilter] = useState('All');

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, analyticsRes, productsRes, salesRes, purchasesRes, batchesRes] = await Promise.allSettled([
        getDashboardStatsApi(),
        getAnalyticsReportApi({ range: 'week' }),
        getProductsApi({ activeOnly: true }),
        getSalesApi({ limit: 60 }),
        getPurchasesApi({ limit: 60 }),
        getExpiryBatchesApi()
      ]);

      let loadedProducts = [];
      if (productsRes.status === 'fulfilled' && productsRes.value?.data?.success && Array.isArray(productsRes.value.data.products)) {
        loadedProducts = productsRes.value.data.products;
        setProducts(loadedProducts);
      } else {
        setProducts([]);
      }

      if (salesRes.status === 'fulfilled' && salesRes.value?.data?.success && Array.isArray(salesRes.value.data.sales)) {
        setSales(salesRes.value.data.sales);
      } else {
        setSales([]);
      }

      if (purchasesRes.status === 'fulfilled' && purchasesRes.value?.data?.success && Array.isArray(purchasesRes.value.data.purchases)) {
        setPurchases(purchasesRes.value.data.purchases);
      } else {
        setPurchases([]);
      }

      let loadedBatches = [];
      if (batchesRes.status === 'fulfilled' && batchesRes.value?.data?.success && Array.isArray(batchesRes.value.data.batches)) {
        loadedBatches = batchesRes.value.data.batches;
        setBatches(loadedBatches);
      } else {
        setBatches([]);
      }

      // Compute live stock units directly from products so it's always accurate & reactive
      const liveTotalStockUnits = loadedProducts.reduce((sum, p) => sum + (Number(p.currentQuantity) || 0), 0);
      const liveInventoryVal = loadedProducts.reduce((sum, p) => sum + ((Number(p.currentQuantity) || 0) * (Number(p.unitPrice) || 0)), 0);
      const liveLowStock = loadedProducts.filter(p => (Number(p.currentQuantity) || 0) <= (Number(p.reorderThreshold) || 20));

      const now = new Date();
      const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const liveExpired = loadedBatches.filter(b => b.status === 'expired' || new Date(b.expiryDate) < now);
      const liveNearExpiry = loadedBatches.filter(b => b.status === 'near-expiry' || (new Date(b.expiryDate) >= now && new Date(b.expiryDate) <= threeDaysLater));

      if (statsRes.status === 'fulfilled' && statsRes.value?.data?.success) {
        const s = statsRes.value.data.stats || {};
        setStats({
          ...s,
          totalStockUnits: liveTotalStockUnits > 0 ? liveTotalStockUnits : (s.totalStockUnits || 0),
          totalInventoryValue: liveInventoryVal > 0 ? liveInventoryVal : (s.totalInventoryValue || 0),
          lowStockCount: liveLowStock.length,
          lowStockItems: liveLowStock.slice(0, 6),
          nearExpiryCount: s.nearExpiryCount !== undefined ? s.nearExpiryCount : liveNearExpiry.length,
          expiredCount: s.expiredCount !== undefined ? s.expiredCount : liveExpired.length
        });
      } else {
        setStats({
          ...FALLBACK_DASHBOARD_KPI.kpis,
          totalStockUnits: liveTotalStockUnits,
          totalInventoryValue: liveInventoryVal,
          lowStockCount: liveLowStock.length,
          lowStockItems: liveLowStock.slice(0, 6),
          nearExpiryCount: liveNearExpiry.length,
          expiredCount: liveExpired.length
        });
      }

      if (analyticsRes.status === 'fulfilled' && analyticsRes.value?.data?.success) {
        setAnalytics(analyticsRes.value.data);
      } else {
        setAnalytics(FALLBACK_DASHBOARD_KPI);
      }
    } catch (error) {
      console.warn('Dashboard fallback active:', error?.message);
      setStats(FALLBACK_DASHBOARD_KPI.kpis);
      setAnalytics(FALLBACK_DASHBOARD_KPI);
    } finally {
      setLoading(false);
    }
  };

  // Filtered Search Results
  const query = searchQuery.trim().toLowerCase();
  
  const matchingProducts = query ? (products || []).filter(p => 
    (p.name || '').toLowerCase().includes(query) ||
    (p.category || '').toLowerCase().includes(query) ||
    (p.qrCode || '').toLowerCase().includes(query)
  ) : [];

  const matchingSales = query ? (sales || []).filter(s => 
    (s.customerName || '').toLowerCase().includes(query) ||
    (s.product?.name || s.productName || '').toLowerCase().includes(query) ||
    (s.paymentMode || '').toLowerCase().includes(query) ||
    (s.outletOrRoute || '').toLowerCase().includes(query)
  ) : [];

  const matchingPurchases = query ? (purchases || []).filter(p => 
    (p.supplierName || '').toLowerCase().includes(query) ||
    (p.product?.name || p.productName || '').toLowerCase().includes(query) ||
    (p.invoiceNumber || '').toLowerCase().includes(query)
  ) : [];

  const matchingBatches = query ? (batches || []).filter(b => 
    (b.batchNumber || '').toLowerCase().includes(query) ||
    (b.product?.name || b.productName || '').toLowerCase().includes(query) ||
    (b.status || '').toLowerCase().includes(query)
  ) : [];

  const totalResultsCount = matchingProducts.length + matchingSales.length + matchingPurchases.length + matchingBatches.length;

  // Filtered Products for Live Inventory Table on Dashboard
  const displayedDashboardProducts = (products || []).filter(p => {
    if (stockCategoryFilter !== 'All' && p.category !== stockCategoryFilter) {
      return false;
    }
    if (query) {
      return (
        (p.name || '').toLowerCase().includes(query) ||
        (p.category || '').toLowerCase().includes(query) ||
        (p.qrCode || '').toLowerCase().includes(query)
      );
    }
    return true;
  });

  const statData = stats || {
    totalStockUnits: 0,
    totalInventoryValue: 0,
    lowStockCount: 0,
    lowStockItems: [],
    nearExpiryCount: 0,
    nearExpiryBatches: [],
    today: { salesAmount: 0, salesQuantity: 0, purchasesAmount: 0, grossProfit: 0 }
  };

  const formattedStockUnits = Number(statData.totalStockUnits || 0).toLocaleString();
  const formattedInventoryVal = Number(statData.totalInventoryValue || 0).toLocaleString();
  const formattedTodaySales = Number(statData.today?.salesAmount || 0).toLocaleString();
  const formattedTodayProfit = Number(statData.today?.grossProfit || 0).toLocaleString();

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Top Header with Welcome & Quick Action Shortcuts */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#a0c396]/30">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1e3a1e] tracking-tight">
              Outlet Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ebf5eb] text-[#1e3a1e] border border-[#a0c396]/40 uppercase tracking-wider">
              {user?.role === 'admin' ? 'Outlet Admin' : 'Staff Mode'}
            </span>
          </div>
          <p className="text-xs text-[#3f5a3f] mt-1">
            Real-time Mother Dairy stock balances, automatic stock deductions, and 3-day expiry alerts.
          </p>
        </div>

        {/* Quick Action Button Group */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/sales"
            className="px-3.5 py-2 bg-[#1e3a1e] hover:bg-[#2d4a2d] text-white rounded-xl text-xs font-bold shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Sale</span>
          </Link>

          <Link
            to="/purchases"
            className="px-3.5 py-2 bg-[#2d4a2d] hover:bg-[#3d6b3d] text-white rounded-xl text-xs font-bold shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Purchase</span>
          </Link>

          <Link
            to="/production"
            className="px-3.5 py-2 bg-[#6a9c6a] hover:bg-[#4c7a4c] text-white rounded-xl text-xs font-bold shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
          >
            <Factory className="w-3.5 h-3.5" />
            <span>Log Batch</span>
          </Link>

          <button
            onClick={fetchDashboardData}
            className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
            title="Refresh dashboard & sync live stocks"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#1e3a1e]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. PROMINENT GLOBAL SEARCH BAR */}
      <div className="relative z-30">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border-2 border-[#a0c396]/50 p-2 sm:p-2.5 shadow-md hover:border-[#1e3a1e]/60 transition-all focus-within:border-[#1e3a1e] focus-within:ring-4 focus-within:ring-[#a0c396]/20">
          <div className="flex items-center gap-2 sm:gap-3 px-2">
            <Search className="w-5 h-5 text-[#2d4a2d] shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Global Search: Type product name, category, QR code, customer, supplier, invoice or batch..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              className="w-full bg-transparent text-sm sm:text-base text-slate-800 placeholder-slate-400 font-medium focus:outline-none py-1.5"
            />

            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Keyboard shortcut hint */}
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-[#ebf5eb] text-[#1e3a1e] border border-[#a0c396]/40 text-[11px] font-mono font-bold shrink-0">
              <span>Ctrl</span>
              <span>+</span>
              <span>K</span>
            </div>
          </div>

          {/* Quick Filter Category Pills */}
          <div className="flex items-center gap-1.5 pt-2 px-1 border-t border-slate-100 mt-2 overflow-x-auto text-[11px] font-semibold text-slate-600 scrollbar-none">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pl-1 mr-1 hidden sm:inline">Search:</span>
            {[
              { id: 'all', label: 'All Results' },
              { id: 'products', label: `Products (${matchingProducts.length})` },
              { id: 'sales', label: `Sales (${matchingSales.length})` },
              { id: 'purchases', label: `Purchases (${matchingPurchases.length})` },
              { id: 'batches', label: `Batches (${matchingBatches.length})` }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setSearchCategory(tab.id);
                  setIsSearchOpen(true);
                }}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                  searchCategory === tab.id
                    ? 'bg-[#1e3a1e] text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Real-Time Dropdown Results Panel */}
        <AnimatePresence>
          {isSearchOpen && searchQuery.trim() && (
            <>
              {/* Click-away backdrop overlay */}
              <div 
                className="fixed inset-0 z-20"
                onClick={() => setIsSearchOpen(false)}
              />

              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden z-30 max-h-[75vh] flex flex-col"
              >
                {/* Header with results count */}
                <div className="px-5 py-3 bg-[#ebf5eb]/60 border-b border-[#a0c396]/30 flex items-center justify-between text-xs">
                  <div className="font-bold text-[#1e3a1e] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#2d4a2d]" />
                    <span>Global Search Results: {totalResultsCount} found for "{searchQuery}"</span>
                  </div>
                  <button
                    onClick={() => setIsSearchOpen(false)}
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                  >
                    Close (Esc)
                  </button>
                </div>

                {/* Results Container */}
                <div className="p-4 overflow-y-auto space-y-5 divide-y divide-slate-100">
                  {totalResultsCount === 0 ? (
                    <div className="py-10 text-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                        <Search className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-slate-700 text-sm">No exact matches found for "{searchQuery}"</h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Try searching for dairy family names like "Milk", "Paneer", "Dahi", "Ghee", customer names, supplier federations, or batch codes.
                      </p>
                    </div>
                  ) : null}

                  {/* 1. Products Section */}
                  {(searchCategory === 'all' || searchCategory === 'products') && matchingProducts.length > 0 && (
                    <div className="space-y-2.5 pt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-black text-[#1e3a1e] uppercase tracking-wider">
                          <Boxes className="w-3.5 h-3.5 text-[#2d4a2d]" />
                          <span>Products & Live Inventory ({matchingProducts.length})</span>
                        </div>
                        <Link
                          to="/stock"
                          onClick={() => setIsSearchOpen(false)}
                          className="text-[11px] font-bold text-[#0B4F9C] hover:underline flex items-center gap-0.5"
                        >
                          <span>Full Stock Page</span>
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {matchingProducts.map((prod) => {
                          const stockQty = Number(prod.currentQuantity || 0);
                          const threshold = Number(prod.reorderThreshold || 20);
                          const isLow = stockQty <= threshold;
                          return (
                            <div 
                              key={prod.id || prod._id}
                              className="p-3 rounded-2xl bg-slate-50 hover:bg-[#ebf5eb]/40 border border-slate-200/80 transition-all flex items-center justify-between gap-3 group"
                            >
                              <div className="min-w-0">
                                <div className="font-bold text-xs text-slate-900 truncate group-hover:text-[#1e3a1e]">
                                  {prod.name}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-mono">
                                  <span>{prod.qrCode}</span>
                                  <span>•</span>
                                  <span className="font-bold text-slate-700">₹{prod.unitPrice} / {prod.unit}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isLow 
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                                    : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                }`}>
                                  {stockQty} {prod.unit}
                                </span>

                                <button
                                  onClick={() => {
                                    setIsSearchOpen(false);
                                    navigate(`/sales?product=${prod._id || prod.id}`);
                                  }}
                                  className="px-2.5 py-1 bg-[#1e3a1e] hover:bg-[#2d4a2d] text-white text-[11px] font-bold rounded-lg transition-transform hover:scale-105 active:scale-95 flex items-center gap-1 shadow-2xs"
                                  title="Quick record sale for this item"
                                >
                                  <Zap className="w-3 h-3" />
                                  <span>Sell</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2. Sales Transactions Section */}
                  {(searchCategory === 'all' || searchCategory === 'sales') && matchingSales.length > 0 && (
                    <div className="space-y-2.5 pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-black text-emerald-800 uppercase tracking-wider">
                          <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Sales Transactions ({matchingSales.length})</span>
                        </div>
                        <Link
                          to="/sales"
                          onClick={() => setIsSearchOpen(false)}
                          className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5"
                        >
                          <span>All Sales</span>
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {matchingSales.slice(0, 6).map((sale) => (
                          <div 
                            key={sale.id || sale._id}
                            className="p-3 rounded-2xl bg-emerald-50/40 hover:bg-emerald-50/80 border border-emerald-100 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-bold text-slate-900 truncate max-w-[170px]">
                                {sale.customerName || 'Counter Sale'}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {sale.product?.name || sale.productName || 'Dairy Item'} ({sale.quantity} units)
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-extrabold text-emerald-700 font-mono">₹{sale.totalAmount}</div>
                              <div className="text-[9px] text-slate-400 uppercase font-bold">{sale.paymentMode || 'Cash'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Purchases & Inward Procurement */}
                  {(searchCategory === 'all' || searchCategory === 'purchases') && matchingPurchases.length > 0 && (
                    <div className="space-y-2.5 pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-black text-[#0B4F9C] uppercase tracking-wider">
                          <Truck className="w-3.5 h-3.5 text-[#0B4F9C]" />
                          <span>Purchases & Suppliers ({matchingPurchases.length})</span>
                        </div>
                        <Link
                          to="/purchases"
                          onClick={() => setIsSearchOpen(false)}
                          className="text-[11px] font-bold text-[#0B4F9C] hover:underline flex items-center gap-0.5"
                        >
                          <span>All Purchases</span>
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {matchingPurchases.slice(0, 6).map((pur) => (
                          <div 
                            key={pur.id || pur._id}
                            className="p-3 rounded-2xl bg-blue-50/40 hover:bg-blue-50/80 border border-blue-100 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-bold text-slate-900 truncate max-w-[170px]">
                                {pur.supplierName || 'Procurement Hub'}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                Inv: {pur.invoiceNumber || 'INV-DIRECT'}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-extrabold text-[#0B4F9C] font-mono">₹{pur.totalAmount}</div>
                              <div className="text-[9px] text-slate-400">{pur.quantity} units</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. Batches & Expiry */}
                  {(searchCategory === 'all' || searchCategory === 'batches') && matchingBatches.length > 0 && (
                    <div className="space-y-2.5 pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-black text-rose-800 uppercase tracking-wider">
                          <Clock className="w-3.5 h-3.5 text-rose-600" />
                          <span>Batches & Expiry Records ({matchingBatches.length})</span>
                        </div>
                        <Link
                          to="/expiry"
                          onClick={() => setIsSearchOpen(false)}
                          className="text-[11px] font-bold text-rose-700 hover:underline flex items-center gap-0.5"
                        >
                          <span>Expiry Tracker</span>
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {matchingBatches.slice(0, 6).map((b) => (
                          <div 
                            key={b.id || b._id}
                            className="p-3 rounded-2xl bg-rose-50/40 hover:bg-rose-50/80 border border-rose-100 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-bold text-slate-900 font-mono">{b.batchNumber}</div>
                              <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                                {b.product?.name || b.productName || 'Batch Item'}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <Badge variant={b.status === 'expired' ? 'danger' : b.status === 'near-expiry' ? 'warning' : 'success'}>
                                {b.quantity} {b.unit || 'units'}
                              </Badge>
                              <div className="text-[9px] text-rose-600 font-mono mt-0.5">
                                Exp: {new Date(b.expiryDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* 3. Top Metric Counter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Stock Units */}
        <StatCard
          title="Total Stock on Hand"
          value={`${formattedStockUnits} Units`}
          subtitle={`Valued at ₹${formattedInventoryVal}`}
          icon={<Boxes className="w-6 h-6" />}
          color="blue"
          onClick={() => navigate('/stock')}
        />

        {/* Today's Sales */}
        <StatCard
          title="Today's Sales Revenue"
          value={`₹${formattedTodaySales}`}
          subtitle={`${statData.today?.salesQuantity || 0} units sold today`}
          icon={<ShoppingCart className="w-6 h-6" />}
          color="emerald"
          trend={{ isPositive: true, text: `+₹${formattedTodayProfit} Est. Profit` }}
          onClick={() => navigate('/sales')}
        />

        {/* Low Stock Warning */}
        <StatCard
          title="Low Stock Items"
          value={`${statData.lowStockCount || 0} Products`}
          subtitle="Below reorder threshold trigger"
          icon={<AlertTriangle className="w-6 h-6" />}
          color={Number(statData.lowStockCount || 0) > 0 ? 'amber' : 'blue'}
          trend={Number(statData.lowStockCount || 0) > 0 ? { isPositive: false, text: 'Needs Restock' } : undefined}
          onClick={() => navigate('/stock?lowStock=true')}
        />

        {/* Near Expiry Risk */}
        <StatCard
          title="Near Expiry (< 3 Days)"
          value={`${statData.nearExpiryCount || 0} Batches`}
          subtitle={`${statData.expiredCount || 0} batches already expired`}
          icon={<Clock className="w-6 h-6" />}
          color={Number(statData.nearExpiryCount || 0) > 0 ? 'rose' : 'emerald'}
          trend={Number(statData.nearExpiryCount || 0) > 0 ? { isPositive: false, text: 'Action Required' } : undefined}
          onClick={() => navigate('/expiry?nearExpiryOnly=true')}
        />
      </div>

      {/* 4. Urgent Attention Section (Low Stock & Near Expiry Lists) */}
      {(statData.lowStockCount > 0 || statData.nearExpiryCount > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Low Stock Warning Box */}
          {statData.lowStockCount > 0 && (
            <div className="bg-amber-50/70 rounded-3xl p-5 border border-amber-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs uppercase tracking-wide">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Low Stock Reorder Alerts ({statData.lowStockCount})</span>
                </div>
                <Link to="/purchases" className="text-xs font-black text-amber-800 hover:underline flex items-center gap-1">
                  <span>Procure More</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(statData.lowStockItems || []).map((item, idx) => (
                  <div key={item.id || item._id || idx} className="bg-white p-3 rounded-2xl border border-amber-100 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-900 truncate max-w-[140px]">{item.name}</div>
                      <div className="text-[10px] text-slate-400">Reorder Threshold: {item.reorderThreshold}</div>
                    </div>
                    <div className="shrink-0">
                      <Badge variant="warning">{item.currentQuantity} {item.unit}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Near Expiry Risk Box */}
          {statData.nearExpiryCount > 0 && (
            <div className="bg-rose-50/70 rounded-3xl p-5 border border-rose-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-900 font-extrabold text-xs uppercase tracking-wide">
                  <Clock className="w-4 h-4 text-rose-600" />
                  <span>Batches Expiring in &lt; 3 Days ({statData.nearExpiryCount})</span>
                </div>
                <Link to="/expiry" className="text-xs font-black text-rose-800 hover:underline flex items-center gap-1">
                  <span>Manage Batches</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(statData.nearExpiryBatches || []).map((batch, idx) => (
                  <div key={batch.id || batch._id || idx} className="bg-white p-3 rounded-2xl border border-rose-100 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-900 truncate max-w-[130px]">{batch.productName}</div>
                      <div className="text-[10px] text-rose-600 font-mono">
                        Exp: {new Date(batch.expiryDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <Badge variant="danger">{batch.quantity} {batch.unit}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. LIVE PRODUCT INVENTORY & STOCK OVERVIEW (Auto-updates on Sale) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-soft p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-[#1e3a1e]" />
              <h3 className="font-black text-base text-slate-900">Live Product Stock & Inventory Status</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live on-hand balance for each Mother Dairy product. Automatically decrements upon recording a sale.
            </p>
          </div>

          {/* Category Filter Pills for Table */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {['All', 'milk', 'curd', 'paneer', 'ghee', 'butter'].map((cat) => (
              <button
                key={cat}
                onClick={() => setStockCategoryFilter(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all capitalize cursor-pointer shrink-0 ${
                  stockCategoryFilter === cat
                    ? 'bg-[#1e3a1e] text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {cat === 'All' ? 'All Dairy' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Stock Cards Grid */}
        {displayedDashboardProducts.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-black text-sm text-slate-800">Clean Live Inventory (0 Products)</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                All demo products have been removed. Scan real products via Barcode Scanner (+ Inward) or add products in Catalog to start live stock tracking.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Link
                to="/stock"
                className="px-4 py-2 bg-[#1e3a1e] hover:bg-[#2d4a2d] text-white rounded-xl text-xs font-bold transition-transform hover:scale-105"
              >
                Go to Stock & Inward
              </Link>
              <Link
                to="/products"
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Manage Products
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pt-1">
            {displayedDashboardProducts.map((prod) => {
              const stock = Number(prod.currentQuantity || 0);
              const threshold = Number(prod.reorderThreshold || 20);
              const isLow = stock <= threshold;
              const isOut = stock <= 0;
              const healthPercent = Math.min(100, Math.round((stock / (threshold * 3)) * 100));

              return (
                <div
                  key={prod.id || prod._id}
                  className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    isOut
                      ? 'bg-rose-50/50 border-rose-200'
                      : isLow
                      ? 'bg-amber-50/40 border-amber-200'
                      : 'bg-white hover:bg-slate-50/70 border-slate-200/90'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {prod.category}
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        isOut
                          ? 'bg-rose-100 text-rose-800'
                          : isLow
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                      </span>
                    </div>

                    <h4 className="font-black text-xs sm:text-sm text-slate-900 mt-2 line-clamp-1" title={prod.name}>
                      {prod.name}
                    </h4>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      {prod.qrCode}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Current Stock</div>
                        <div className={`text-base font-black font-mono ${
                          isOut ? 'text-rose-600' : isLow ? 'text-amber-700' : 'text-slate-900'
                        }`}>
                          {stock} <span className="text-xs font-normal text-slate-500">{prod.unit}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Price</div>
                        <div className="text-sm font-extrabold text-slate-800 font-mono">₹{prod.unitPrice}</div>
                      </div>
                    </div>

                    {/* Stock health progress bar */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOut ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.max(5, healthPercent)}%` }}
                      />
                    </div>

                    {/* Quick Action: Record Sale Button */}
                    <div className="pt-1 flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/sales?product=${prod._id || prod.id}`)}
                        disabled={isOut}
                        className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
                          isOut
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-[#1e3a1e] hover:bg-[#2d4a2d] text-white hover:scale-[1.02] active:scale-[0.98]'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Sell This Product</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Interactive Recharts: Weekly Trend & Category Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Sales vs Purchases Area Chart */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-black text-sm text-slate-900">Weekly Revenue & Purchase Inflow</h3>
              <p className="text-[11px] text-slate-400">Comparing outgoing sales vs inward procurement</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 font-bold text-emerald-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Sales (₹)
              </span>
              <span className="flex items-center gap-1.5 font-bold text-[#0B4F9C]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0B4F9C]"></span> Purchases (₹)
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {analytics?.timeSeries && analytics.timeSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0B4F9C" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0B4F9C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(str) => String(str || '').slice(5)} 
                    tick={{ fill: '#94a3b8', fontSize: 10 }} 
                  />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '16px', fontSize: '11px' }} 
                  />
                  <Area type="monotone" dataKey="sales" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" name="Sales (₹)" />
                  <Area type="monotone" dataKey="purchases" stroke="#0B4F9C" strokeWidth={2} fillOpacity={1} fill="url(#colorPurchases)" name="Purchases (₹)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No recent transaction history recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Category Share Distribution */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-soft flex flex-col justify-between">
          <div>
            <h3 className="font-black text-sm text-slate-900 mb-1">Sales by Dairy Category</h3>
            <p className="text-[11px] text-slate-400 mb-4">Volume distribution across product families</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {analytics?.categoryBreakdown && analytics.categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.categoryBreakdown}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {analytics.categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', fontSize: '11px' }} 
                    formatter={(val) => `₹${val}`}
                  />
                  <Legend 
                    formatter={(val) => <span className="text-[10px] capitalize text-slate-600 font-bold">{val}</span>} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">No category sales recorded yet.</div>
            )}
          </div>

          <div className="pt-2 text-center">
            <Link to="/reports" className="text-xs font-black text-[#0B4F9C] hover:underline flex items-center justify-center gap-1">
              <span>View Full Financial Breakdown</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
