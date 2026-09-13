import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  getExpiryBatchesApi, 
  createExpiryBatchApi, 
  discardBatchApi, 
  deleteExpiryBatchApi, 
  getProductsApi 
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import ProductSelect from '../components/common/ProductSelect';
import { 
  Clock, 
  Plus, 
  AlertTriangle, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  RefreshCw, 
  Calendar, 
  ShieldAlert,
  Flame
} from 'lucide-react';

const ExpiryBatches = () => {
  const [searchParams] = useSearchParams();
  const { isAdmin } = useAuth();
  const { addToast } = useToast();

  const [batches, setBatches] = useState([]);
  const [summary, setSummary] = useState({
    totalBatches: 0,
    freshCount: 0,
    nearExpiryCount: 0,
    nearExpiryRiskUnits: 0,
    expiredCount: 0,
    expiredWastageUnits: 0,
    discardedCount: 0
  });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('nearExpiryOnly') === 'true' ? 'near-expiry' : 'all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedBatchForDiscard, setSelectedBatchForDiscard] = useState(null);
  const [discardReason, setDiscardReason] = useState('Expired beyond 3-day shelf life safety limit');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    productId: '',
    batchNumber: '',
    manufactureDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    quantity: 20,
    notes: ''
  });

  useEffect(() => {
    fetchProducts();
    fetchBatches();
  }, [statusFilter]);

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

  const fetchBatches = async () => {
    try {
      const res = await getExpiryBatchesApi({
        status: statusFilter === 'all' ? undefined : statusFilter,
        nearExpiryOnly: searchParams.get('nearExpiryOnly') === 'true' ? 'true' : undefined
      });
      if (res.data?.success && res.data?.batches) {
        setBatches(res.data.batches);
        if (res.data.summary) setSummary(res.data.summary);
      }
    } catch (error) {
      console.warn('Using fallback expiry batches');
      setBatches(FALLBACK_EXPIRY_BATCHES);
      setSummary(FALLBACK_EXPIRY_SUMMARY);
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
      expiryDate: calcExpiry,
      batchNumber: `BCH-${product.category.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-5)}`
    });
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!formData.productId || !formData.batchNumber || !formData.expiryDate) {
      addToast('Please fill all required batch fields', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const res = await createExpiryBatchApi(formData);
      if (res.data.success) {
        addToast(res.data.message, 'success');
        setIsCreateModalOpen(false);
        setFormData({
          productId: '',
          batchNumber: '',
          manufactureDate: new Date().toISOString().split('T')[0],
          expiryDate: '',
          quantity: 20,
          notes: ''
        });
        fetchBatches();
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to create batch', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDiscardBatch = async (e) => {
    e.preventDefault();
    if (!selectedBatchForDiscard) return;

    try {
      setSubmitting(true);
      const res = await discardBatchApi(selectedBatchForDiscard._id, { discardReason });
      if (res.data.success) {
        addToast(res.data.message, 'info');
        setSelectedBatchForDiscard(null);
        fetchBatches();
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to discard batch', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBatch = async (batchId) => {
    if (!window.confirm('Delete this batch tracking record?')) return;

    try {
      const res = await deleteExpiryBatchApi(batchId);
      if (res.data.success) {
        addToast(res.data.message, 'info');
        fetchBatches();
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to delete batch', 'error');
    }
  };

  const filteredBatches = batches.filter((b) =>
    b.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.productId?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-rose-600" />
            <span>Expiry Batch Tracking & Freshness</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated daily freshness checks with 3-day near-expiry risk flagging and batch write-offs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Log Manual Batch</span>
          </button>

          <button
            onClick={fetchBatches}
            className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-colors"
            title="Refresh batches"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fresh Batches</span>
            <div className="text-xl font-black text-emerald-700 mt-0.5">{summary.freshCount} Active</div>
            <span className="text-[10px] text-emerald-600 font-bold">&gt; 3 Days Safe</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Near Expiry Risk</span>
            <div className="text-xl font-black text-amber-600 mt-0.5">{summary.nearExpiryCount} Batches</div>
            <span className="text-[10px] text-amber-700 font-bold">{summary.nearExpiryRiskUnits} units &lt; 3 days</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-rose-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Expired Batches</span>
            <div className="text-xl font-black text-rose-600 mt-0.5">{summary.expiredCount} Batches</div>
            <span className="text-[10px] text-rose-700 font-bold">{summary.expiredWastageUnits} units to discard</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Discarded / Spoiled</span>
            <div className="text-xl font-black text-slate-700 mt-0.5">{summary.discardedCount} Batches</div>
            <span className="text-[10px] text-slate-500">Written off inventory</span>
          </div>
        </div>
      )}

      {/* 3. Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search batch number, product name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All Batches' },
            { id: 'fresh', label: 'Fresh' },
            { id: 'near-expiry', label: '⚡ Near Expiry (< 3 Days)' },
            { id: 'expired', label: '❌ Expired' },
            { id: 'discarded', label: 'Discarded' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-rose-600 text-white shadow-xs font-black'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Batch Table */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 animate-pulse">
          Loading expiry tracking batches...
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-2">
          <Clock className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-extrabold text-sm text-slate-700">No Batches Found</h3>
          <p className="text-xs text-slate-400">Batches are automatically generated on Purchases or can be logged manually.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 font-black">Batch #</th>
                  <th className="py-3.5 px-4 font-black">Product</th>
                  <th className="py-3.5 px-4 font-black">Mfg Date</th>
                  <th className="py-3.5 px-4 font-black">Expiry Date</th>
                  <th className="py-3.5 px-4 font-black">Batch Quantity</th>
                  <th className="py-3.5 px-4 font-black">Freshness Status</th>
                  <th className="py-3.5 px-4 font-black">Logged By</th>
                  <th className="py-3.5 px-4 font-black text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredBatches.map((batch) => {
                  const daysRemaining = Math.ceil((new Date(batch.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                  return (
                    <tr key={batch._id} className="hover:bg-rose-50/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-dairy-blue">
                        {batch.batchNumber}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">
                          {batch.productId?.name || 'Deleted Product'}
                        </div>
                        <span className="text-[10px] text-slate-400 capitalize">
                          {batch.productId?.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(batch.manufactureDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>

                      <td className="py-3.5 px-4 font-bold">
                        <div className={daysRemaining <= 0 ? 'text-rose-600' : daysRemaining <= 3 ? 'text-amber-600' : 'text-slate-800'}>
                          {new Date(batch.expiryDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <span className="text-[10px] text-slate-400 block font-normal">
                          {daysRemaining < 0 ? `${Math.abs(daysRemaining)} days ago` : daysRemaining === 0 ? 'Expires today' : `${daysRemaining} days left`}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-black text-slate-900">
                          {batch.quantity} {batch.productId?.unit}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        {batch.status === 'fresh' && <Badge variant="success">Fresh</Badge>}
                        {batch.status === 'near-expiry' && <Badge variant="warning">⚡ &lt; 3 Days Risk</Badge>}
                        {batch.status === 'expired' && <Badge variant="danger">❌ Expired</Badge>}
                        {batch.status === 'discarded' && <Badge variant="default">Discarded</Badge>}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {batch.addedBy?.name || 'Staff'}
                      </td>

                      {/* Actions: Discard Write-Off & Admin Delete */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {batch.status !== 'discarded' && (
                            <button
                              onClick={() => setSelectedBatchForDiscard(batch)}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1"
                              title="Discard / write-off spoiled stock"
                            >
                              <Flame className="w-3 h-3 text-amber-600" />
                              <span>Discard</span>
                            </button>
                          )}

                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteBatch(batch._id)}
                              className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                              title="Delete batch record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Create Manual Batch Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Log Tracked Expiry Batch"
        subtitle="Manually record a production batch and monitor its shelf life countdown."
        icon={<Clock className="w-5 h-5 text-rose-600" />}
      >
        <form onSubmit={handleCreateBatch} className="space-y-4">
          <ProductSelect
            products={products}
            selectedProductId={formData.productId}
            onSelectProduct={handleSelectProduct}
            required
            accentColor="rose"
          />


          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Batch Number
              </label>
              <input
                type="text"
                required
                value={formData.batchNumber}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Batch Quantity
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Manufacture Date
              </label>
              <input
                type="date"
                required
                value={formData.manufactureDate}
                onChange={(e) => setFormData({ ...formData, manufactureDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.productId}
              className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md transition-colors"
            >
              {submitting ? 'Logging Batch...' : 'Save Tracked Batch'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 6. Discard & Write-Off Stock Modal */}
      <Modal
        isOpen={!!selectedBatchForDiscard}
        onClose={() => setSelectedBatchForDiscard(null)}
        title="Discard & Write-Off Spoiled Batch"
        subtitle={`Mark batch ${selectedBatchForDiscard?.batchNumber} as discarded and deduct ${selectedBatchForDiscard?.quantity} units from inventory.`}
        icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
      >
        <form onSubmit={handleDiscardBatch} className="space-y-4">
          <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
            <span className="font-black block">Wastage Warning:</span>
            <p>
              Confirming this write-off will immediately mark this batch as discarded, reduce active stock count, and log this event in the audit trail & financial loss reports.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reason for Discard / Wastage Note
            </label>
            <textarea
              required
              rows={2}
              value={discardReason}
              onChange={(e) => setDiscardReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            ></textarea>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSelectedBatchForDiscard(null)}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-md transition-colors"
            >
              {submitting ? 'Writing off stock...' : 'Confirm Write-Off'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ExpiryBatches;
