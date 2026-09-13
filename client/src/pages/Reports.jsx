import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { 
  getAnalyticsReportApi, 
  getProductsApi, 
  getExportCsvUrl 
} from '../services/api';
import { FALLBACK_ANALYTICS_REPORT, FALLBACK_PRODUCTS } from '../utils/demoFallbackData';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Badge from '../components/common/Badge';
import { 
  FileText, 
  Download, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Calendar, 
  Filter, 
  PieChart as PieChartIcon, 
  ShoppingBag, 
  ShoppingCart, 
  Flame, 
  RefreshCw,
  Printer,
  Sparkles,
  Award,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  LineChart,
  Line,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';

const Reports = () => {
  const { isAdmin } = useAuth();
  const { addToast } = useToast();

  const [analytics, setAnalytics] = useState(FALLBACK_ANALYTICS_REPORT);
  const [products, setProducts] = useState(FALLBACK_PRODUCTS);
  const [loading, setLoading] = useState(false);

  // Filters
  const [range, setRange] = useState('month'); // today, week, month, year, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState('best'); // 'best', 'worst', 'turnover'

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [range, startDate, endDate, selectedProduct]);

  const fetchProducts = async () => {
    try {
      const res = await getProductsApi({ activeOnly: true });
      if (res.data?.success && Array.isArray(res.data?.products)) {
        setProducts(res.data.products);
      } else {
        setProducts([]);
      }
    } catch (e) {
      setProducts([]);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = { range };
      if (range === 'custom') {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }
      if (selectedProduct !== 'all') {
        params.productId = selectedProduct;
      }

      const res = await getAnalyticsReportApi(params);
      if (res.data?.success && res.data?.summary) {
        setAnalytics(res.data);
      }
    } catch (error) {
      console.warn('Using fallback financial analytics report');
      setAnalytics(FALLBACK_ANALYTICS_REPORT);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCsv = (type) => {
    const url = getExportCsvUrl(type);
    window.open(url, '_blank');
    addToast(`Exporting ${type} CSV report...`, 'info');
  };

  // Generate and Download PDF Report using jsPDF
  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Header Banner
      doc.setFillColor(30, 58, 30); // Deep Forest Green
      doc.rect(0, 0, 210, 24, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      doc.text('MOTHER DAIRY — PROFIT & LOSS FINANCIAL REPORT', 105, 11, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(215, 235, 215);
      const periodLabel = range === 'custom' 
        ? `${startDate || 'Start'} to ${endDate || 'End'}` 
        : range.toUpperCase();
      doc.text(`Reporting Period: ${periodLabel} | Generated: ${new Date().toLocaleString()}`, 105, 18, { align: 'center' });

      // KPI Summary Section
      let y = 32;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(30, 58, 30);
      doc.text('1. EXECUTIVE FINANCIAL SUMMARY', 14, y);

      y += 5;
      const kpis = [
        { label: 'Gross Revenue', val: `Rs. ${Number(summary.totalSalesAmount || 0).toLocaleString()}` },
        { label: 'Total COGS (Cost)', val: `Rs. ${Number(summary.totalCOGS || 0).toLocaleString()}` },
        { label: 'Gross Profit', val: `Rs. ${Number(summary.grossProfit || 0).toLocaleString()}` },
        { label: 'Procurement Inward', val: `Rs. ${Number(summary.totalPurchasesAmount || 0).toLocaleString()}` },
        { label: 'Net Profit', val: `Rs. ${Number(summary.netProfit || 0).toLocaleString()}` },
        { label: 'Profit Margin', val: `${summary.profitMarginPct || 0}%` },
      ];

      kpis.forEach((kpi, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const posX = 14 + col * 62;
        const posY = y + row * 15;
        doc.setFillColor(244, 248, 242);
        doc.roundedRect(posX, posY, 58, 12.5, 2, 2, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(kpi.label, posX + 4, posY + 4);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 58, 30);
        doc.text(kpi.val, posX + 4, posY + 9.5);
      });

      y += 36;
      // Category Breakdown Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(30, 58, 30);
      doc.text('2. CATEGORY PERFORMANCE & TURNOVER', 14, y);

      y += 5;
      doc.setFillColor(235, 245, 235);
      doc.rect(14, y, 182, 6, 'F');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 58, 30);
      doc.text('CATEGORY', 18, y + 4.2);
      doc.text('REVENUE (Rs)', 85, y + 4.2, { align: 'right' });
      doc.text('COST (Rs)', 120, y + 4.2, { align: 'right' });
      doc.text('PROFIT (Rs)', 155, y + 4.2, { align: 'right' });
      doc.text('MARGIN %', 190, y + 4.2, { align: 'right' });

      y += 7;
      doc.setFont('helvetica', 'normal');
      (analytics?.categoryBreakdown || []).slice(0, 8).forEach((cat) => {
        doc.text(String(cat.category || 'General').toUpperCase(), 18, y + 3.8);
        doc.text(Number(cat.revenue || cat.amount || 0).toLocaleString(), 85, y + 3.8, { align: 'right' });
        doc.text(Number(cat.cost || 0).toLocaleString(), 120, y + 3.8, { align: 'right' });
        doc.text(Number(cat.profit || 0).toLocaleString(), 155, y + 3.8, { align: 'right' });
        doc.text(`${cat.profitMargin || 0}%`, 190, y + 3.8, { align: 'right' });
        doc.setDrawColor(241, 245, 249);
        doc.line(14, y + 5, 196, y + 5);
        y += 5.5;
      });

      y += 6;
      // Product Margin Leaderboard
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(30, 58, 30);
      doc.text('3. PRODUCT PROFITABILITY AUDIT', 14, y);

      y += 5;
      doc.setFillColor(235, 245, 235);
      doc.rect(14, y, 182, 6, 'F');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 58, 30);
      doc.text('PRODUCT NAME', 18, y + 4.2);
      doc.text('CATEGORY', 80, y + 4.2);
      doc.text('QTY SOLD', 110, y + 4.2, { align: 'right' });
      doc.text('REVENUE (Rs)', 140, y + 4.2, { align: 'right' });
      doc.text('PROFIT (Rs)', 168, y + 4.2, { align: 'right' });
      doc.text('MARGIN %', 190, y + 4.2, { align: 'right' });

      y += 7;
      doc.setFont('helvetica', 'normal');
      const sampleProds = [
        ...(analytics?.bestPerformingProducts || []).slice(0, 7),
        ...(analytics?.worstPerformingProducts || []).slice(0, 5)
      ];
      const seen = new Set();
      sampleProds.forEach((prod) => {
        if (seen.has(prod.id)) return;
        seen.add(prod.id);
        if (y > 272) {
          doc.addPage();
          y = 20;
        }
        doc.text(String(prod.name || '').slice(0, 32), 18, y + 3.8);
        doc.text(String(prod.category || '').slice(0, 14), 80, y + 3.8);
        doc.text(`${prod.quantitySold || prod.totalQty || 0} ${prod.unit || ''}`, 110, y + 3.8, { align: 'right' });
        doc.text(Number(prod.revenue || prod.totalAmount || 0).toLocaleString(), 140, y + 3.8, { align: 'right' });
        doc.text(Number(prod.profit || 0).toLocaleString(), 168, y + 3.8, { align: 'right' });
        doc.text(`${prod.profitMargin || 0}%`, 190, y + 3.8, { align: 'right' });
        doc.setDrawColor(241, 245, 249);
        doc.line(14, y + 5, 196, y + 5);
        y += 5.5;
      });

      // Footer
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('Mother Dairy Inventory & POS — Automated Financial Audit & P&L Statement', 105, 290, { align: 'center' });

      doc.save(`mother_dairy_profit_and_loss_${range}_${new Date().toISOString().split('T')[0]}.pdf`);
      addToast('Profit & Loss PDF Report downloaded successfully!', 'success');
    } catch (err) {
      console.error('PDF generation error:', err);
      addToast('Failed to generate PDF report: ' + err.message, 'error');
    }
  };

  const summary = analytics?.summary || {
    totalSalesAmount: 0,
    totalSalesQuantity: 0,
    totalPurchasesAmount: 0,
    totalPurchasesQuantity: 0,
    totalCOGS: 0,
    totalCost: 0,
    grossProfit: 0,
    batchWastageLoss: 0,
    netProfit: 0,
    profitMarginPct: 0
  };

  // Select which product list to display based on active tab
  const getLeaderboardList = () => {
    if (activeLeaderboardTab === 'best') {
      return analytics?.bestPerformingProducts || [];
    }
    if (activeLeaderboardTab === 'worst') {
      return analytics?.worstPerformingProducts || [];
    }
    return analytics?.topSelling || [];
  };

  const currentLeaderboard = getLeaderboardList();

  return (
    <div className="space-y-7 pb-12 font-sans">
      {/* 1. Header & Export Actions */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#a0c396]/30 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#ebf5eb] text-[#1e3a1e] rounded-full text-[11px] font-bold tracking-wider uppercase border border-[#a0c396]/40 mb-2">
            <FileText className="w-3.5 h-3.5" />
            <span>Financial & P&L Intelligence</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1e3a1e] tracking-tight">
            Profit & Loss Reports & Dashboard
          </h1>
          <p className="text-xs text-[#3f5a3f] mt-1 max-w-xl">
            Unit-level profit calculations, COGS margin analytics, dynamic Recharts trend lines, and automated audit exports.
          </p>
        </div>

        {/* Export Buttons: CSVs & PDF */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleDownloadCsv('profit-loss')}
            className="px-3.5 py-2 bg-[#f4f8f2] hover:bg-[#ebf5eb] text-[#1e3a1e] border border-[#a0c396]/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Download full Profit & Loss statement in CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#3d6b3d]" />
            <span>P&L Ledger (CSV)</span>
          </button>

          <button
            onClick={() => handleDownloadCsv('sales')}
            className="px-3 py-2 bg-[#f4f8f2] hover:bg-[#ebf5eb] text-[#1e3a1e] border border-[#a0c396]/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-[#1e3a1e]" />
            <span>Sales (CSV)</span>
          </button>

          <button
            onClick={() => handleDownloadCsv('purchases')}
            className="px-3 py-2 bg-[#f4f8f2] hover:bg-[#ebf5eb] text-[#1e3a1e] border border-[#a0c396]/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-[#1e3a1e]" />
            <span>Purchases (CSV)</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            className="px-4 py-2 bg-[#1e3a1e] hover:bg-[#2d4a2d] text-white rounded-xl text-xs font-bold shadow-md shadow-[#1e3a1e]/15 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#9bc09b]" />
            <span>Export P&L Report (PDF)</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Controls & Date Range Picker */}
      <div className="bg-white p-5 rounded-3xl border border-[#a0c396]/30 shadow-soft space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Time Range Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'Last 7 Days' },
              { id: 'month', label: 'Last 30 Days' },
              { id: 'thisMonth', label: 'This Month' },
              { id: 'year', label: 'This Year' },
              { id: 'custom', label: 'Custom Range' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRange(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  range === tab.id
                    ? 'bg-[#1e3a1e] text-[#f8f5f0] shadow-sm font-bold'
                    : 'bg-[#f4f8f2] text-[#3f5a3f] hover:bg-[#ebf5eb] hover:text-[#1e3a1e]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Product Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#3f5a3f]">Product Filter:</span>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="px-3.5 py-2 bg-[#f4f8f2] border border-[#a0c396]/40 rounded-xl text-xs font-bold text-[#1e3a1e] focus:outline-none focus:ring-2 focus:ring-[#1e3a1e]"
            >
              <option value="all">All Products (Full Portfolio)</option>
              {products.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Date Inputs if Custom selected */}
        {range === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#a0c396]/20 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#1e3a1e]">Start Date:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-[#f4f8f2] border border-[#a0c396]/40 rounded-xl px-3 py-1.5 text-xs text-[#1e3a1e] focus:ring-1 focus:ring-[#1e3a1e]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#1e3a1e]">End Date:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-[#f4f8f2] border border-[#a0c396]/40 rounded-xl px-3 py-1.5 text-xs text-[#1e3a1e] focus:ring-1 focus:ring-[#1e3a1e]"
              />
            </div>
            <button
              onClick={fetchAnalytics}
              className="px-3 py-1.5 bg-[#1e3a1e] text-white rounded-xl text-xs font-bold hover:bg-[#2d4a2d] transition cursor-pointer"
            >
              Apply Filter
            </button>
          </div>
        )}
      </div>

      {/* 3. High-Level Financial KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-3xl border border-[#a0c396]/30 shadow-soft">
          <div className="flex items-center justify-between text-xs text-[#3f5a3f] font-bold uppercase tracking-wider mb-1">
            <span>Gross Revenue</span>
            <ShoppingCart className="w-4 h-4 text-[#3d6b3d]" />
          </div>
          <div className="text-2xl font-bold text-[#1e3a1e] font-serif">
            ₹{Number(summary.totalSalesAmount || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-[#3f5a3f] font-medium">
            {summary.totalSalesQuantity || 0} units sold in period
          </span>
        </div>

        {/* Total Cost / Procurement */}
        <div className="bg-white p-5 rounded-3xl border border-[#a0c396]/30 shadow-soft">
          <div className="flex items-center justify-between text-xs text-[#3f5a3f] font-bold uppercase tracking-wider mb-1">
            <span>COGS (Goods Cost)</span>
            <ShoppingBag className="w-4 h-4 text-[#2d4a2d]" />
          </div>
          <div className="text-2xl font-bold text-[#2d4a2d] font-serif">
            ₹{Number(summary.totalCOGS || summary.totalCost || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-[#3f5a3f] font-medium">
            ₹{Number(summary.totalPurchasesAmount || 0).toLocaleString()} inward procured
          </span>
        </div>

        {/* Gross Profit */}
        <div className="bg-white p-5 rounded-3xl border border-[#a0c396]/30 shadow-soft">
          <div className="flex items-center justify-between text-xs text-[#3f5a3f] font-bold uppercase tracking-wider mb-1">
            <span>Gross Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className={`text-2xl font-bold font-serif ${summary.grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            ₹{Number(summary.grossProfit || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-emerald-700 font-bold">
            (Selling Price − Cost Price) × Qty
          </span>
        </div>

        {/* Net Profit & Margin */}
        <div className="bg-white p-5 rounded-3xl border border-[#a0c396]/30 shadow-soft">
          <div className="flex items-center justify-between text-xs text-[#3f5a3f] font-bold uppercase tracking-wider mb-1">
            <span>Net Profit & Margin</span>
            <Sparkles className="w-4 h-4 text-[#6a9c6a]" />
          </div>
          <div className={`text-2xl font-bold font-serif ${summary.netProfit >= 0 ? 'text-[#1e3a1e]' : 'text-rose-700'}`}>
            ₹{Number(summary.netProfit || 0).toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#ebf5eb] text-[#1e3a1e] font-bold border border-[#a0c396]/40">
              {summary.profitMarginPct || 0}% Margin
            </span>
            {summary.batchWastageLoss > 0 && (
              <span className="text-[10px] text-rose-600 font-medium">
                -₹{Number(summary.batchWastageLoss).toLocaleString()} spoilage
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 4. Recharts Visualizations: Revenue vs Cost Trend Line & Category Profit Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Cost Trend Line */}
        <div className="bg-white p-6 rounded-3xl border border-[#a0c396]/30 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-base font-bold text-[#1e3a1e]">
                Revenue vs. Cost Trend Line
              </h3>
              <p className="text-xs text-[#3f5a3f]">Sales inflow compared with COGS and gross profit</p>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 bg-[#ebf5eb] text-[#1e3a1e] rounded-full border border-[#a0c396]/40">
              Daily Ledger
            </span>
          </div>

          <div className="h-64 w-full">
            {analytics?.timeSeries && analytics.timeSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="repRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1e3a1e" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#1e3a1e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="repCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d97706" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickFormatter={(s) => String(s || '').slice(5)} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', fontSize: '11px', borderColor: '#a0c396' }} 
                    formatter={(val) => `₹${Number(val).toLocaleString()}`}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" stroke="#1e3a1e" strokeWidth={2.5} fillOpacity={1} fill="url(#repRevenue)" name="Revenue (₹)" />
                  <Area type="monotone" dataKey="cost" stroke="#d97706" strokeWidth={2} fillOpacity={1} fill="url(#repCost)" name="Cost (₹)" />
                  <Line type="monotone" dataKey="profit" stroke="#16a34a" strokeWidth={2.2} dot={{ r: 3 }} name="Profit (₹)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No transaction records found for the selected period.
              </div>
            )}
          </div>
        </div>

        {/* Profit by Category Bar Chart */}
        <div className="bg-white p-6 rounded-3xl border border-[#a0c396]/30 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-base font-bold text-[#1e3a1e]">
                Profit & Revenue by Product Category
              </h3>
              <p className="text-xs text-[#3f5a3f]">Gross margin and revenue contribution across families</p>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 bg-[#ebf5eb] text-[#1e3a1e] rounded-full border border-[#a0c396]/40">
              {analytics?.categoryBreakdown?.length || 0} Categories
            </span>
          </div>

          <div className="h-64 w-full">
            {analytics?.categoryBreakdown && analytics.categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.categoryBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', fontSize: '11px', borderColor: '#a0c396' }} 
                    formatter={(v) => `₹${Number(v).toLocaleString()}`} 
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#3d6b3d" radius={[6, 6, 0, 0]} name="Revenue (₹)" />
                  <Bar dataKey="profit" fill="#16a34a" radius={[6, 6, 0, 0]} name="Profit (₹)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No category sales records found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Best vs Worst Performing Products by Profit Margin Leaderboard */}
      <div className="bg-white p-6 rounded-3xl border border-[#a0c396]/30 shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#a0c396]/20 pb-4">
          <div>
            <h3 className="font-serif text-base font-bold text-[#1e3a1e] flex items-center gap-2">
              <span>Product Margin Performance Leaderboard</span>
              <Award className="w-4 h-4 text-amber-500" />
            </h3>
            <p className="text-xs text-[#3f5a3f]">
              Margin calculation: (Profit / Revenue) × 100 per sold item
            </p>
          </div>

          {/* Leaderboard Segment Tabs */}
          <div className="flex items-center gap-1.5 bg-[#f4f8f2] p-1 rounded-2xl border border-[#a0c396]/30">
            <button
              onClick={() => setActiveLeaderboardTab('best')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeLeaderboardTab === 'best'
                  ? 'bg-[#1e3a1e] text-white shadow-xs'
                  : 'text-[#3f5a3f] hover:text-[#1e3a1e]'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Best Margin</span>
            </button>

            <button
              onClick={() => setActiveLeaderboardTab('worst')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeLeaderboardTab === 'worst'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'text-[#3f5a3f] hover:text-[#1e3a1e]'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5 text-rose-300" />
              <span>Lowest Margin</span>
            </button>

            <button
              onClick={() => setActiveLeaderboardTab('turnover')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeLeaderboardTab === 'turnover'
                  ? 'bg-[#1e3a1e] text-white shadow-xs'
                  : 'text-[#3f5a3f] hover:text-[#1e3a1e]'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-[#9bc09b]" />
              <span>Top Turnover</span>
            </button>
          </div>
        </div>

        {/* Table of products */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f4f8f2] text-[#1e3a1e] font-bold border-b border-[#a0c396]/30">
              <tr>
                <th className="p-3 w-12 text-center">Rank</th>
                <th className="p-3">Product Name</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Units Sold</th>
                <th className="p-3 text-right">Total Revenue</th>
                <th className="p-3 text-right">Total Cost</th>
                <th className="p-3 text-right">Gross Profit</th>
                <th className="p-3 text-right">Profit Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentLeaderboard && currentLeaderboard.length > 0 ? (
                currentLeaderboard.map((prod, idx) => {
                  const margin = Number(prod.profitMargin || 0);
                  const isHighMargin = margin >= 20;
                  const isLowMargin = margin < 10;
                  return (
                    <tr key={idx} className="hover:bg-[#f4f8f2]/50 transition-colors">
                      <td className="p-3 text-center font-bold text-[#1e3a1e]">
                        #{idx + 1}
                      </td>
                      <td className="p-3 font-bold text-[#1e3a1e]">
                        {prod.name}
                      </td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ebf5eb] text-[#2d4a2d] border border-[#a0c396]/30 uppercase">
                          {prod.category}
                        </span>
                      </td>
                      <td className="p-3 text-right font-medium text-slate-700">
                        {prod.quantitySold || prod.totalQty || 0} {prod.unit}
                      </td>
                      <td className="p-3 text-right font-bold text-[#1e3a1e]">
                        ₹{Number(prod.revenue || prod.totalAmount || 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-medium text-slate-600">
                        ₹{Number(prod.cost || 0).toLocaleString()}
                      </td>
                      <td className={`p-3 text-right font-bold ${Number(prod.profit || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        ₹{Number(prod.profit || 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-right">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                          isHighMargin
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : isLowMargin
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {margin}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-xs text-slate-400">
                    No sales recorded for this period. Try switching the date range filter above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
