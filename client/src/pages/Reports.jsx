import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { 
  getAnalyticsReportApi, 
  getProductsApi, 
  exportReportCsvApi,
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

  // Robust CSV Download with JWT Blob and fallback
  const handleDownloadCsv = async (type) => {
    try {
      addToast(`Preparing ${type.toUpperCase()} CSV report...`, 'info');
      const res = await exportReportCsvApi(type);
      
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `mother_dairy_${type}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      addToast(`${type.toUpperCase()} CSV exported successfully!`, 'success');
    } catch (err) {
      console.warn('API CSV export error, attempting direct URL fallback:', err);
      try {
        const url = getExportCsvUrl(type);
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.download = `mother_dairy_${type}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        addToast(`Exported ${type} CSV!`, 'success');
      } catch (fallbackErr) {
        addToast('Failed to export CSV: ' + (err.message || 'Error occurred'), 'error');
      }
    }
  };

  // Dedicated A4 Print Report using isolated hidden iframe
  const handlePrintReport = () => {
    try {
      const existing = document.getElementById('report-print-frame');
      if (existing) existing.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'report-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const periodLabel = range === 'custom' 
        ? `${startDate || 'Start'} to ${endDate || 'End'}` 
        : range.toUpperCase();

      const kpis = [
        { label: 'Gross Revenue', val: `Rs. ${Number(summary.totalSalesAmount || 0).toLocaleString()}` },
        { label: 'COGS (Cost of Goods)', val: `Rs. ${Number(summary.totalCOGS || summary.totalCost || 0).toLocaleString()}` },
        { label: 'Gross Profit', val: `Rs. ${Number(summary.grossProfit || 0).toLocaleString()}` },
        { label: 'Procurement Inward', val: `Rs. ${Number(summary.totalPurchasesAmount || 0).toLocaleString()}` },
        { label: 'Net Profit', val: `Rs. ${Number(summary.netProfit || 0).toLocaleString()}` },
        { label: 'Profit Margin', val: `${summary.profitMarginPct || 0}%` },
      ];

      const categoryRows = (analytics?.categoryBreakdown || []).map(cat => `
        <tr>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 700;">${String(cat.category || 'General').toUpperCase()}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">Rs. ${Number(cat.revenue || cat.amount || 0).toLocaleString()}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">Rs. ${Number(cat.cost || 0).toLocaleString()}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #166534;">Rs. ${Number(cat.profit || 0).toLocaleString()}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700;">${cat.profitMargin || 0}%</td>
        </tr>
      `).join('');

      const sampleLeaderboard = getLeaderboardList();
      const productRows = (sampleLeaderboard || []).slice(0, 15).map((p, idx) => `
        <tr>
          <td style="padding: 5px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #64748b;">#${idx + 1}</td>
          <td style="padding: 5px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${p.name}</td>
          <td style="padding: 5px 8px; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; font-size: 9.5px;">${p.category}</td>
          <td style="padding: 5px 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${p.quantitySold || p.totalQty || 0} ${p.unit || ''}</td>
          <td style="padding: 5px 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">Rs. ${Number(p.revenue || p.totalAmount || 0).toLocaleString()}</td>
          <td style="padding: 5px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #166534;">Rs. ${Number(p.profit || 0).toLocaleString()}</td>
          <td style="padding: 5px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700;">${p.profitMargin || 0}%</td>
        </tr>
      `).join('');

      const doc = iframe.contentWindow || iframe.contentDocument;
      const targetDoc = doc.document || doc;

      targetDoc.open();
      targetDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Mother Dairy - Profit & Loss Financial Report</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 8mm 10mm;
              }
              * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                color: #0f172a;
                background: #ffffff;
                padding: 12px;
                font-size: 11px;
                line-height: 1.4;
              }
              .banner {
                background: #1e3a1e;
                color: #ffffff;
                padding: 12px 16px;
                border-radius: 8px;
                text-align: center;
                margin-bottom: 14px;
              }
              .banner h1 {
                font-size: 17px;
                font-weight: 800;
                letter-spacing: 0.5px;
              }
              .banner p {
                font-size: 10px;
                color: #cde4cd;
                margin-top: 3px;
              }
              .section-heading {
                font-size: 11.5px;
                font-weight: 800;
                color: #1e3a1e;
                text-transform: uppercase;
                margin: 12px 0 6px;
                border-bottom: 2px solid #a0c396;
                padding-bottom: 3px;
              }
              .kpi-row {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
                margin-bottom: 12px;
              }
              .kpi-cell {
                background: #f4f8f2;
                border: 1px solid #d1e7cf;
                border-radius: 6px;
                padding: 8px 10px;
              }
              .kpi-lbl {
                font-size: 9px;
                color: #475569;
                text-transform: uppercase;
                font-weight: 600;
              }
              .kpi-num {
                font-size: 13.5px;
                font-weight: 800;
                color: #1e3a1e;
                margin-top: 2px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 12px;
                font-size: 10px;
              }
              th {
                background: #ebf5eb;
                color: #1e3a1e;
                text-transform: uppercase;
                font-size: 9px;
                font-weight: 800;
                padding: 6px 8px;
                border-bottom: 2px solid #a0c396;
              }
              .footer {
                text-align: center;
                font-size: 8.5px;
                color: #94a3b8;
                margin-top: 16px;
                border-top: 1px solid #e2e8f0;
                padding-top: 6px;
              }
            </style>
          </head>
          <body>
            <div class="banner">
              <h1>MOTHER DAIRY — PROFIT & LOSS STATEMENT</h1>
              <p>Period: ${periodLabel} • Generated: ${new Date().toLocaleString()}</p>
            </div>

            <div class="section-heading">1. Financial Performance Summary</div>
            <div class="kpi-row">
              ${kpis.map(k => `
                <div class="kpi-cell">
                  <div class="kpi-lbl">${k.label}</div>
                  <div class="kpi-num">${k.val}</div>
                </div>
              `).join('')}
            </div>

            <div class="section-heading">2. Category Turnover & Margin</div>
            <table>
              <thead>
                <tr>
                  <th style="text-align: left;">Category</th>
                  <th style="text-align: right;">Revenue</th>
                  <th style="text-align: right;">Cost</th>
                  <th style="text-align: right;">Profit</th>
                  <th style="text-align: right;">Margin %</th>
                </tr>
              </thead>
              <tbody>
                ${categoryRows || '<tr><td colspan="5" style="text-align:center; padding:8px;">No category records</td></tr>'}
              </tbody>
            </table>

            <div class="section-heading">3. Product Profitability Performance</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 30px; text-align: center;">#</th>
                  <th style="text-align: left;">Product Name</th>
                  <th style="text-align: left;">Category</th>
                  <th style="text-align: right;">Qty Sold</th>
                  <th style="text-align: right;">Revenue</th>
                  <th style="text-align: right;">Gross Profit</th>
                  <th style="text-align: right;">Margin %</th>
                </tr>
              </thead>
              <tbody>
                ${productRows || '<tr><td colspan="7" style="text-align:center; padding:8px;">No product records</td></tr>'}
              </tbody>
            </table>

            <div class="footer">
              Mother Dairy Inventory & POS System — Official Financial Ledger & P&L Statement
            </div>
          </body>
        </html>
      `);
      targetDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (err) {
          console.warn('Iframe print fallback:', err);
          window.print();
        }
      }, 300);
    } catch (e) {
      console.error('Print statement error:', e);
      window.print();
    }
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
        { label: 'Total COGS (Cost)', val: `Rs. ${Number(summary.totalCOGS || summary.totalCost || 0).toLocaleString()}` },
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

        {/* Export Buttons: CSVs, Print & PDF */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleDownloadCsv('profit-loss')}
            className="px-3 py-2 bg-[#f4f8f2] hover:bg-[#ebf5eb] text-[#1e3a1e] border border-[#a0c396]/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Download full Profit & Loss statement in CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#3d6b3d]" />
            <span>P&L (CSV)</span>
          </button>

          <button
            onClick={() => handleDownloadCsv('sales')}
            className="px-3 py-2 bg-[#f4f8f2] hover:bg-[#ebf5eb] text-[#1e3a1e] border border-[#a0c396]/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Export Sales Ledger CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#1e3a1e]" />
            <span>Sales (CSV)</span>
          </button>

          <button
            onClick={() => handleDownloadCsv('purchases')}
            className="px-3 py-2 bg-[#f4f8f2] hover:bg-[#ebf5eb] text-[#1e3a1e] border border-[#a0c396]/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Export Purchases Inward CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#1e3a1e]" />
            <span>Purchases (CSV)</span>
          </button>

          <button
            onClick={handlePrintReport}
            className="px-3.5 py-2 bg-[#f4f8f2] hover:bg-[#ebf5eb] text-[#1e3a1e] border border-[#a0c396]/60 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:scale-102 active:scale-98"
            title="Print formatted A4 financial statement"
          >
            <Printer className="w-3.5 h-3.5 text-[#2d4a2d]" />
            <span>Print Report</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            className="px-3.5 py-2 bg-[#1e3a1e] hover:bg-[#2d4a2d] text-white rounded-xl text-xs font-bold shadow-md shadow-[#1e3a1e]/15 transition-all flex items-center gap-1.5 cursor-pointer hover:scale-102 active:scale-98"
            title="Download formatted A4 PDF statement"
          >
            <Download className="w-3.5 h-3.5 text-[#9bc09b]" />
            <span>Download PDF</span>
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
