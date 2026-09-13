import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  getPurchasesApi, 
  createPurchaseApi, 
  deletePurchaseApi, 
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
  ShoppingBag, 
  Plus, 
  Camera, 
  Search, 
  Trash2, 
  Calendar, 
  Truck, 
  DollarSign, 
  FileText, 
  RefreshCw, 
  CheckCircle2,
  Package,
  Layers,
  ScanBarcode
} from 'lucide-react';
import { FALLBACK_PURCHASES, FALLBACK_PRODUCTS } from '../utils/demoFallbackData';

const Purchases = () => {

  const [searchParams] = useSearchParams();
  const { isAdmin } = useAuth();
  const { addToast } = useToast();

  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // New Purchase Modal & Scanner State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    productId: '',
    quantity: 50,
    costPrice: 28,
    supplierName: '',
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    expiryDate: '',
    batchNumber: '',
    notes: ''
  });

  useEffect(() => {
    fetchProducts();
    fetchPurchases();
  }, [startDate, endDate]);

  // Handle query parameter for auto-selecting product from scan or link
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

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await getPurchasesApi(params);
      if (res.data?.success && Array.isArray(res.data.purchases)) {
        setPurchases(res.data.purchases);
      } else {
        setPurchases([]);
      }
    } catch (error) {
      console.warn('Purchases load error:', error?.message);
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };


  const handleSelectProduct = (product) => {
    if (!product) return;
    const shelfLife = product.shelfLifeDays || 3;
    const calcExpiry = new Date(Date.now() + shelfLife * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    setFormData({
      ...formData,
      productId: product._id,
      costPrice: product.costPrice || Math.round(product.unitPrice * 0.8),
      expiryDate: calcExpiry,
      batchNumber: `BCH-${product.category.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-5)}`
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
      addToast(`Auto-filled: ${matched.name} (${matched.category})`, 'success');
      return;
    }

    // If not in pre-loaded products, query the backend code lookup endpoint
    try {
      const res = await getProductByCodeApi(scannedCode);
      if (res.data?.success && res.data.product) {
        matched = res.data.product;
        handleSelectProduct(matched);
        setIsModalOpen(true);
        addToast(`Auto-filled: ${matched.name}`, 'success');
        return;
      }
    } catch (err) {
      console.warn('Barcode lookup in purchases error:', err);
    }

    addToast(`No product found in catalog matching Barcode "${scannedCode}".`, 'warning');
  };

  const handleSubmitPurchase = async (e) => {
    e.preventDefault();
    if (!formData.productId) {
      addToast('Please select or scan a product first', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const res = await createPurchaseApi(formData);
      if (res.data.success) {
        addToast(res.data.message, 'success');
        setIsModalOpen(false);
        setFormData({
          productId: '',
          quantity: 50,
          costPrice: 28,
          supplierName: '',
          invoiceNumber: '',
          date: new Date().toISOString().split('T')[0],
          expiryDate: '',
          batchNumber: '',
          notes: ''
        });
        fetchPurchases();
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to record purchase', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePurchase = async (purchaseId) => {
    if (!window.confirm('Delete this purchase record? The added stock quantity will be reversed automatically.')) {
      return;
    }

    try {
      const res = await deletePurchaseApi(purchaseId);
      if (res.data.success) {
        addToast(res.data.message, 'info');
        fetchPurchases();
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to delete purchase', 'error');
    }
  };

  const selectedProductObj = products.find((p) => p._id === formData.productId);
  const totalCost = Number(formData.quantity || 0) * Number(formData.costPrice || 0);

  const searchLower = (supplierSearch || '').toLowerCase();
  const filteredPurchases = purchases.filter((p) => {
    if (!p) return false;
    const sup = (p.supplierName || '').toLowerCase();
    const prodName = (p.productId?.name || p.product?.name || '').toLowerCase();
    const inv = (p.invoiceNumber || '').toLowerCase();
    return sup.includes(searchLower) || prodName.includes(searchLower) || inv.includes(searchLower);
  });


  return (
    <div className="space-y-6">
      {/* 1. Header with Scan & Procure Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-[#0B4F9C]" />
            <span>Purchases & Inward Inflow</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Log farm procurement and dairy packaging receipts. Automatically increments inventory & creates batches.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Barcode Scanner Trigger */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold shadow-2xs transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
            title="Scan Barcode to Auto-fill Product"
          >
            <ScanBarcode className="w-4 h-4 text-emerald-600" />
            <span>Barcode Scanner</span>
          </button>

          {/* Record Purchase Modal Trigger */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-[#0B4F9C] hover:bg-[#083D7A] text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Record Purchase</span>
          </button>
        </div>
      </div>

      {/* 2. Filters Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by supplier, product or invoice #..."
            value={supplierSearch}
            onChange={(e) => setSupplierSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
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

      {/* 3. Purchases List Table */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 animate-pulse">
          Loading purchase records...
        </div>
      ) : filteredPurchases.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-2">
          <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-extrabold text-sm text-slate-700">No Purchases Recorded</h3>
          <p className="text-xs text-slate-400">Record a new procurement or scan a product QR code to get started.</p>
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
                  <th className="py-3.5 px-4 font-black">Unit Cost</th>
                  <th className="py-3.5 px-4 font-black">Total Paid</th>
                  <th className="py-3.5 px-4 font-black">Supplier / Farmer</th>
                  <th className="py-3.5 px-4 font-black">Invoice #</th>
                  <th className="py-3.5 px-4 font-black">Logged By</th>
                  {isAdmin && <th className="py-3.5 px-4 font-black text-right">Reversal</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredPurchases.map((purchase) => (
                  <tr key={purchase._id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(purchase.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">
                        {purchase.productId?.name || 'Deleted Product'}
                      </div>
                      <span className="text-[10px] text-dairy-blue font-mono font-bold">
                        {purchase.productId?.qrCode}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-black text-emerald-700">
                        +{purchase.quantity} {purchase.productId?.unit}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">₹{purchase.costPrice}</td>
                    <td className="py-3.5 px-4 font-black text-slate-900">
                      ₹{purchase.totalAmount?.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {purchase.supplierName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {purchase.invoiceNumber || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {purchase.addedBy?.name || 'Staff'}
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeletePurchase(purchase._id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                          title="Delete purchase and reverse stock"
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

      {/* 4. Record Purchase Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Stock Purchase / Inflow"
        subtitle="Purchased items are automatically added to live stock and create a tracked batch."
        icon={<ShoppingBag className="w-5 h-5 text-[#0B4F9C]" />}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmitPurchase} className="space-y-4">
          {/* QR Scan or Select Product with Search/Type */}
          <ProductSelect
            products={products}
            selectedProductId={formData.productId}
            onSelectProduct={handleSelectProduct}
            required
            showScanner
            onOpenScanner={() => setIsScannerOpen(true)}
            accentColor="blue"
          />


          {/* Quantity & Unit Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Purchase Quantity ({selectedProductObj?.unit || 'Units'})
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Unit Cost Price (₹ / {selectedProductObj?.unit || 'Unit'})
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

          {/* Supplier Name & Invoice # */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Supplier / Farmer Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Anand Dairy Farmers Co-op"
                value={formData.supplierName}
                onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Invoice / Challan # (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. INV-2026-99"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
              />
            </div>
          </div>

          {/* Batch Number & Expiry Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Batch Number (Auto-Generated)
              </label>
              <input
                type="text"
                required
                value={formData.batchNumber}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                required
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
              />
            </div>
          </div>

          {/* Total Amount Preview Banner */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Total Purchase Amount:</span>
            <span className="text-lg font-black text-[#0B4F9C]">₹{totalCost?.toLocaleString()}</span>
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
              className="flex-1 py-2.5 bg-[#0B4F9C] hover:bg-[#083D7A] disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md transition-colors"
            >
              {submitting ? 'Saving & Syncing Stock...' : 'Save & Add to Stock'}
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
        subtitle="Point camera at product barcode to auto-populate purchase form"
      />
    </div>
  );
};

export default Purchases;
