import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  getSalesApi, 
  createSaleApi, 
  deleteSaleApi, 
  getProductsApi,
  getProductByCodeApi
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import BarcodeScanner from '../components/common/BarcodeScanner';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import ProductSelect from '../components/common/ProductSelect';
import { 
  ShoppingCart, 
  Plus, 
  Camera, 
  Search, 
  Trash2, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Receipt, 
  RefreshCw, 
  CreditCard,
  Banknote,
  QrCode
} from 'lucide-react';
import { FALLBACK_SALES, FALLBACK_PRODUCTS } from '../utils/demoFallbackData';


const Sales = () => {
  const [searchParams] = useSearchParams();
  const { isAdmin } = useAuth();
  const { addToast } = useToast();

  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customerSearch, setCustomerSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // New Sale Modal & Scanner State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    productId: '',
    quantity: 1,
    sellingPrice: 34,
    customerName: 'Counter Customer',
    outletOrRoute: 'Main Dairy Counter',
    paymentMode: 'Cash',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchProducts();
    fetchSales();
  }, [startDate, endDate]);

  useEffect(() => {
    const qrParam = searchParams.get('qr');
    const prodParam = searchParams.get('product');

    if (qrParam && products.length > 0) {
      handleQrMatched(qrParam);
      setIsModalOpen(true);
    } else if (prodParam && products.length > 0) {
      const match = products.find(
        (p) => String(p._id) === String(prodParam) || String(p.id) === String(prodParam) || p.qrCode === prodParam
      );
      if (match) {
        handleSelectProduct(match);
        setIsModalOpen(true);
      }
    }
  }, [searchParams, products]);

  const fetchProducts = async () => {
    try {
      const res = await getProductsApi({ activeOnly: true });
      if (res.data?.success && Array.isArray(res.data.products)) {
        setProducts(res.data.products);
      } else {
        setProducts([]);
      }
    } catch (e) {
      setProducts([]);
    }
  };

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await getSalesApi(params);
      if (res.data?.success && Array.isArray(res.data.sales)) {
        setSales(res.data.sales);
      } else {
        setSales([]);
      }
    } catch (error) {
      console.warn('Sales load error:', error?.message);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };


  const handleSelectProduct = (product) => {
    if (!product) return;
    setFormData({
      ...formData,
      productId: product._id,
      sellingPrice: product.unitPrice || 40,
      quantity: 1
    });
  };

  // Barcode / QR Code Auto-fill Handler
  const handleQrMatched = async (scannedCode) => {
    setIsScannerOpen(false);
    const upper = (scannedCode || '').trim().toUpperCase();
    let matched = products.find(
      (p) => 
        (p.barcode && p.barcode.toUpperCase() === upper) ||
        (p.qrCode && p.qrCode.toUpperCase() === upper) || 
        String(p._id) === scannedCode ||
        String(p.id) === scannedCode
    );

    if (matched) {
      handleSelectProduct(matched);
      setIsModalOpen(true);
      addToast(`Auto-filled: ${matched.name} (Stock: ${matched.currentQuantity})`, 'success');
      return;
    }

    // Lookup via API
    try {
      const res = await getProductByCodeApi(scannedCode);
      if (res.data?.success && res.data.product) {
        matched = res.data.product;
        handleSelectProduct(matched);
        setIsModalOpen(true);
        addToast(`Auto-filled: ${matched.name} (Stock: ${matched.currentStock || matched.currentQuantity || 0})`, 'success');
        return;
      }
    } catch (err) {
      console.warn('Barcode lookup in sales error:', err);
    }

    addToast(`No product found matching Barcode "${scannedCode}".`, 'warning');
  };

  const handleSubmitSale = async (e) => {
    e.preventDefault();
    if (!formData.productId) {
      addToast('Please select or scan a product first', 'warning');
      return;
    }

    const selectedProduct = products.find((p) => p._id === formData.productId);
    if (selectedProduct && Number(formData.quantity) > (selectedProduct.currentQuantity || 0)) {
      addToast(`Insufficient stock! Available: ${selectedProduct.currentQuantity}, Requested: ${formData.quantity}`, 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await createSaleApi(formData);
      if (res.data.success) {
        addToast(res.data.message, 'success');
        setIsModalOpen(false);
        setFormData({
          productId: '',
          quantity: 1,
          sellingPrice: 34,
          customerName: 'Counter Customer',
          outletOrRoute: 'Main Dairy Counter',
          paymentMode: 'Cash',
          date: new Date().toISOString().split('T')[0],
          notes: ''
        });
        fetchSales();
        fetchProducts(); // Refresh stocks
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to record sale', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSale = async (saleId) => {
    if (!window.confirm('Delete this sale record? The sold quantity will be restocked automatically.')) {
      return;
    }

    try {
      const res = await deleteSaleApi(saleId);
      if (res.data.success) {
        addToast(res.data.message, 'info');
        fetchSales();
        fetchProducts();
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to delete sale', 'error');
    }
  };

  const selectedProductObj = products.find((p) => p._id === formData.productId);
  const totalAmount = Number(formData.quantity || 0) * Number(formData.sellingPrice || 0);
  const estCost = Number(formData.quantity || 0) * Number(selectedProductObj?.costPrice || 0);
  const estProfit = Math.max(0, totalAmount - estCost);

  const searchLower = (customerSearch || '').toLowerCase();
  const filteredSales = sales.filter((s) => {
    if (!s) return false;
    const cust = (s.customerName || '').toLowerCase();
    const prodName = (s.productId?.name || s.product?.name || '').toLowerCase();
    const mode = (s.paymentMode || '').toLowerCase();
    return cust.includes(searchLower) || prodName.includes(searchLower) || mode.includes(searchLower);
  });


  return (
    <div className="space-y-6">
      {/* 1. Header with Scan & Record Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-emerald-600" />
            <span>Sales & Outward Dispatch</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Record retail counter sales and wholesale distribution. Automatically deducts inventory and logs profit.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Scan QR Trigger */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-[#0B4F9C] border border-blue-200 rounded-xl text-xs font-bold shadow-2xs transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
          >
            <Camera className="w-4 h-4 text-cyan-600" />
            <span>Scan Product QR</span>
          </button>

          {/* Record Sale Modal Trigger */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Record New Sale</span>
          </button>
        </div>
      </div>

      {/* 2. Filters Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customer, product or payment mode..."
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-500">Date Range:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-[#FAF8F5] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-[#FAF8F5] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs text-rose-500 hover:underline font-bold ml-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* 3. Sales List Table */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 animate-pulse">
          Loading sales records...
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-2">
          <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-extrabold text-sm text-slate-700">No Sales Recorded</h3>
          <p className="text-xs text-slate-400">Click "+ Record New Sale" or scan a product QR code to create one.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 font-black">Date</th>
                  <th className="py-3.5 px-4 font-black">Product</th>
                  <th className="py-3.5 px-4 font-black">Quantity</th>
                  <th className="py-3.5 px-4 font-black">Selling Price</th>
                  <th className="py-3.5 px-4 font-black">Total Revenue</th>
                  <th className="py-3.5 px-4 font-black">Customer / Route</th>
                  <th className="py-3.5 px-4 font-black">Payment</th>
                  <th className="py-3.5 px-4 font-black">Staff</th>
                  {isAdmin && <th className="py-3.5 px-4 font-black text-right">Reversal</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredSales.map((sale) => (
                  <tr key={sale._id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(sale.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">
                        {sale.productId?.name || 'Deleted Product'}
                      </div>
                      <span className="text-[10px] text-dairy-blue font-mono font-bold">
                        {sale.productId?.qrCode}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-black text-slate-900">
                        {sale.quantity} {sale.productId?.unit}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">₹{sale.sellingPrice}</td>
                    <td className="py-3.5 px-4 font-black text-emerald-700">
                      ₹{sale.totalAmount?.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{sale.customerName}</div>
                      <div className="text-[10px] text-slate-400">{sale.outletOrRoute}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={sale.paymentMode === 'UPI' ? 'primary' : sale.paymentMode === 'Card' ? 'purple' : 'success'}>
                        {sale.paymentMode}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {sale.addedBy?.name || 'Staff'}
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteSale(sale._id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                          title="Delete sale and restock quantity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Record Sale Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Outward Sale"
        subtitle="Sold items are automatically deducted from live stock and profit is logged."
        icon={<ShoppingCart className="w-5 h-5 text-emerald-600" />}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmitSale} className="space-y-4">
          {/* Select or Scan Product with Type-to-Search */}
          <ProductSelect
            products={products}
            selectedProductId={formData.productId}
            onSelectProduct={handleSelectProduct}
            required
            showStock
            showScanner
            onOpenScanner={() => setIsScannerOpen(true)}
            accentColor="emerald"
          />


          {/* Quantity & Unit Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Sale Quantity ({selectedProductObj?.unit || 'Units'})
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                max={selectedProductObj?.currentQuantity || 9999}
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Unit Selling Price (₹ / {selectedProductObj?.unit || 'Unit'})
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Customer & Route */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Customer Name / Account
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Walk-in or Hotel Palace"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Outlet / Delivery Route
              </label>
              <input
                type="text"
                placeholder="e.g. Counter #1 or Route 4"
                value={formData.outletOrRoute}
                onChange={(e) => setFormData({ ...formData, outletOrRoute: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Payment Method
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['Cash', 'UPI', 'Card', 'Credit/Account'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFormData({ ...formData, paymentMode: mode })}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                    formData.paymentMode === mode
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Total Revenue & Profit Preview Banner */}
          <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-700 block">Total Sale Amount:</span>
              <span className="text-lg font-black text-emerald-800">₹{totalAmount?.toLocaleString()}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-bold block">Estimated Gross Profit:</span>
              <span className="text-sm font-black text-emerald-600">+₹{estProfit}</span>
            </div>
          </div>

          {/* Submit Actions */}
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
              disabled={submitting || !formData.productId}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md transition-colors"
            >
              {submitting ? 'Deducting Stock & Logging...' : 'Complete Sale'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 5. Barcode & QR Code Camera Scanner Modal */}
      <BarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleQrMatched}
        title="Scan Product Barcode"
        subtitle="Point camera at product barcode to auto-populate sale form"
      />
    </div>
  );
};

export default Sales;
