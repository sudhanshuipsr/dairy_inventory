import React, { useState, useEffect } from 'react';
import { 
  getSuppliersApi, 
  createSupplierApi, 
  updateSupplierApi, 
  deleteSupplierApi 
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/common/Modal';
import { 
  Building2, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  Truck
} from 'lucide-react';

const SUPPLIER_CATEGORIES = [
  { id: 'All', label: 'All Suppliers', icon: '🏢' },
  { id: 'raw_milk', label: 'Raw Milk / Farmers', icon: '🥛' },
  { id: 'packaging', label: 'Packaging & Cartons', icon: '📦' },
  { id: 'ingredients', label: 'Cultures & Ingredients', icon: '🧪' },
  { id: 'equipment', label: 'Chilling & Dairy Tech', icon: '⚙️' },
  { id: 'logistics', label: 'Cold-Chain Transport', icon: '🚚' },
  { id: 'general', label: 'General / Consumables', icon: '📋' }
];

export default function SupplierManagement() {
  const { isAdmin } = useAuth();
  const { addToast } = useToast();

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    gstNumber: '',
    category: 'raw_milk',
    isActive: true
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await getSuppliersApi();
      if (res.data?.success && Array.isArray(res.data.suppliers)) {
        setSuppliers(res.data.suppliers);
      } else {
        setSuppliers([]);
      }
    } catch (error) {
      console.warn('Supplier fetch error:', error?.message);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      gstNumber: '',
      category: 'raw_milk',
      isActive: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (supplier) => {
    setIsEditing(true);
    setEditingId(supplier.id);
    setFormData({
      name: supplier.name || '',
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      gstNumber: supplier.gstNumber || '',
      category: supplier.category || 'raw_milk',
      isActive: supplier.isActive !== undefined ? supplier.isActive : true
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (isEditing) {
        const res = await updateSupplierApi(editingId, formData);
        if (res.data?.success) {
          addToast(res.data.message || 'Supplier updated successfully', 'success');
          setIsModalOpen(false);
          fetchSuppliers();
        }
      } else {
        const res = await createSupplierApi(formData);
        if (res.data?.success) {
          addToast(res.data.message || 'Supplier registered successfully', 'success');
          setIsModalOpen(false);
          fetchSuppliers();
        }
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to save supplier', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Permanently remove supplier "${name}"?`)) return;
    try {
      const res = await deleteSupplierApi(id);
      if (res.data?.success) {
        addToast(res.data.message || 'Supplier deleted', 'info');
        fetchSuppliers();
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to delete supplier', 'error');
    }
  };

  const filteredSuppliers = suppliers.filter((s) => {
    if (!s) return false;
    const matchesCat = categoryFilter === 'All' || s.category === categoryFilter;
    const q = searchQuery.toLowerCase();
    const matchesQuery = 
      (s.name || '').toLowerCase().includes(q) ||
      (s.contactPerson || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.gstNumber || '').toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#0B4F9C]" />
            <span>Supplier & Vendor Directory</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage dairy procurement partners, farmers, packaging distributors, and logistics contacts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-[#0B4F9C] hover:bg-[#083D7A] text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Supplier</span>
            </button>
          )}

          <button
            onClick={fetchSuppliers}
            className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-colors"
            title="Refresh suppliers"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Filters & Search */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search vendor name, phone, email, GST..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {SUPPLIER_CATEGORIES.map((cat) => (
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
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Supplier Cards */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 animate-pulse font-bold text-xs">
          Loading supplier directory...
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-2">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-extrabold text-sm text-slate-700">No Suppliers Found</h3>
          <p className="text-xs text-slate-400">
            {isAdmin ? 'Register your procurement vendors and farmers to link with bulk orders.' : 'No vendors currently match your search.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredSuppliers.map((supplier) => {
            const catInfo = SUPPLIER_CATEGORIES.find(c => c.id === supplier.category) || { label: supplier.category, icon: '🏢' };

            return (
              <div
                key={supplier.id}
                className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-soft hover:shadow-lg transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-[#0B4F9C] bg-blue-50 px-2.5 py-0.5 rounded-full text-[11px] border border-blue-100 flex items-center gap-1">
                      <span>{catInfo.icon}</span>
                      <span>{catInfo.label}</span>
                    </span>

                    {supplier.isActive ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3 text-slate-400" />
                        <span>Inactive</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-black text-base text-slate-900 leading-snug">
                      {supplier.name}
                    </h3>
                    {supplier.contactPerson && (
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Attn: {supplier.contactPerson}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    {supplier.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <a href={`tel:${supplier.phone}`} className="hover:text-[#0B4F9C] font-semibold text-slate-800">
                          {supplier.phone}
                        </a>
                      </div>
                    )}

                    {supplier.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <a href={`mailto:${supplier.email}`} className="hover:text-[#0B4F9C] truncate text-slate-700">
                          {supplier.email}
                        </a>
                      </div>
                    )}

                    {supplier.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="text-slate-600 leading-tight text-[11px] line-clamp-2">
                          {supplier.address}
                        </span>
                      </div>
                    )}

                    {supplier.gstNumber && (
                      <div className="flex items-center gap-2 text-[11px]">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          GST: {supplier.gstNumber}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Actions */}
                {isAdmin && (
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenEditModal(supplier)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDelete(supplier.id, supplier.name)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Delete supplier"
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

      {/* 4. Add / Edit Supplier Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Edit Supplier Details' : 'Register New Supplier'}
        subtitle="Manage vendor contact info, GST credentials, and dairy supply category."
        icon={<Building2 className="w-5 h-5 text-[#0B4F9C]" />}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Supplier / Company Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Anand Milk Producers Union"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Contact Person
              </label>
              <input
                type="text"
                placeholder="e.g. Rajesh Patel"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Primary Phone Number *
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. +91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="vendor@dairyco.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
              >
                {SUPPLIER_CATEGORIES.filter(c => c.id !== 'All').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                GST Number
              </label>
              <input
                type="text"
                placeholder="24ABCDE1234F1Z5"
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="isActiveCheck"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-[#0B4F9C] rounded border-slate-300 focus:ring-[#0B4F9C]"
              />
              <label htmlFor="isActiveCheck" className="text-xs font-bold text-slate-800 select-none">
                Supplier is Active
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Physical / Dispatch Address
            </label>
            <textarea
              rows={2}
              placeholder="Plot No., Industrial Area, City, State, PIN"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
            />
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
              {submitting ? 'Saving...' : isEditing ? 'Update Supplier' : 'Register Supplier'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
