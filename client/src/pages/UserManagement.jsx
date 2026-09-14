import React, { useState, useEffect } from 'react';
import { 
  getAllUsersApi, 
  registerStaffApi, 
  updateUserApi, 
  deleteUserApi 
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  UserX, 
  Edit3, 
  Trash2, 
  RefreshCw, 
  Lock, 
  Mail, 
  Phone, 
  CheckCircle2 
} from 'lucide-react';

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // New User Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff',
    phone: ''
  });

  // Edit User Form State
  const [editForm, setEditForm] = useState({
    name: '',
    role: 'staff',
    phone: '',
    isActive: true,
    password: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await getAllUsersApi();
      if (res.data.success) {
        setUsers(res.data.users);
      }
    } catch (error) {
      addToast('Failed to load user accounts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await registerStaffApi(createForm);
      if (res.data.success) {
        addToast(res.data.message, 'success');
        setIsCreateModalOpen(false);
        setCreateForm({
          name: '',
          email: '',
          password: '',
          role: 'staff',
          phone: ''
        });
        fetchUsers();
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to create account', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (user) => {
    setSelectedUserForEdit(user);
    setEditForm({
      name: user.name,
      role: user.role,
      phone: user.phone || '',
      isActive: user.isActive,
      password: ''
    });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;

    try {
      setSubmitting(true);
      const payload = { ...editForm };
      if (!payload.password) delete payload.password;

      const res = await updateUserApi(selectedUserForEdit._id, payload);
      if (res.data.success) {
        addToast(res.data.message, 'success');
        setSelectedUserForEdit(null);
        fetchUsers();
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to update user', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (user._id === currentUser._id) {
      addToast('Cannot delete your own active administrator account', 'warning');
      return;
    }

    if (!window.confirm(`Delete user account for "${user.name}" (${user.email})?`)) return;

    try {
      const res = await deleteUserApi(user._id);
      if (res.data.success) {
        addToast(res.data.message, 'info');
        fetchUsers();
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to delete user', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-[#0B4F9C]" />
            <span>Staff & User Access Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Administer plant operator roles, restrict permissions, and create authorized personnel credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-[#0B4F9C] hover:bg-[#083D7A] text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Create Staff Account</span>
          </button>

          <button
            onClick={fetchUsers}
            className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-colors"
            title="Refresh users"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. RBAC Access Information Banner */}
      <div className="bg-blue-50/70 p-4 rounded-3xl border border-blue-200 text-xs text-slate-700 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[#0B4F9C] flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-extrabold text-[#0B4F9C]">Enforced Role Permissions Architecture:</div>
          <p className="text-slate-600 leading-relaxed text-[11px]">
            <strong>Admin:</strong> Full system access, audit trail viewing, product catalog CRUD, staff account management, and record deletion reversals.<br />
            <strong>Staff:</strong> Operational access only (bulk orders, adding stock, retail sales, and expiry checking). Cannot delete records or manage accounts.
          </p>
        </div>
      </div>

      {/* 3. User Accounts Table */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 animate-pulse">
          Loading authorized user accounts...
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-2">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-extrabold text-sm text-slate-700">No Staff Users Found</h3>
          <p className="text-xs text-slate-400">Click "+ Create Staff Account" to register new personnel.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 font-black">User Details</th>
                  <th className="py-3.5 px-4 font-black">Email Address</th>
                  <th className="py-3.5 px-4 font-black">Role</th>
                  <th className="py-3.5 px-4 font-black">Phone</th>
                  <th className="py-3.5 px-4 font-black">Status</th>
                  <th className="py-3.5 px-4 font-black">Created At</th>
                  <th className="py-3.5 px-4 font-black text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {users.map((u) => {
                  const isSelf = u._id === currentUser?._id;
                  return (
                    <tr key={u._id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#0B4F9C] flex items-center justify-center font-black text-xs">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isSelf && (
                                <span className="text-[9px] font-black bg-blue-100 text-[#0B4F9C] px-1.5 py-0.5 rounded">
                                  YOU
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        {u.email}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge variant={u.role === 'admin' ? 'warning' : 'primary'}>
                          {u.role === 'admin' ? 'Administrator' : 'Staff'}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {u.phone || '—'}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge variant={u.isActive ? 'success' : 'danger'}>
                          {u.isActive ? 'Active' : 'Deactivated'}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                            title="Edit user details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {!isSelf && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors"
                              title="Delete account"
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

      {/* 4. Create Staff Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Personnel Account"
        subtitle="Register an authorized staff or administrator account for dairy operations."
        icon={<UserPlus className="w-5 h-5 text-[#0B4F9C]" />}
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Suresh Kumar"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email Address (Login Username)
            </label>
            <input
              type="email"
              required
              placeholder="suresh@dairy.com"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Role Permission
              </label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
              >
                <option value="staff">Staff (Restricted Access)</option>
                <option value="admin">Administrator (Full Access)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Phone Number (Optional)
            </label>
            <input
              type="text"
              placeholder="+91 98765 00000"
              value={createForm.phone}
              onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
            />
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
              disabled={submitting}
              className="flex-1 py-2.5 bg-[#0B4F9C] hover:bg-[#083D7A] disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 5. Edit User Modal */}
      <Modal
        isOpen={!!selectedUserForEdit}
        onClose={() => setSelectedUserForEdit(null)}
        title="Edit User Account"
        subtitle={`Update details or change role for ${selectedUserForEdit?.name}`}
        icon={<Edit3 className="w-5 h-5 text-[#0B4F9C]" />}
      >
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Role Permission
              </label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
              >
                <option value="staff">Staff</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Account Status
              </label>
              <select
                value={editForm.isActive ? 'true' : 'false'}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'true' })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
              >
                <option value="true">Active (Allowed Access)</option>
                <option value="false">Deactivated (Blocked)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reset Password (Leave blank to keep unchanged)
            </label>
            <input
              type="password"
              placeholder="Enter new password if changing"
              value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Phone Number
            </label>
            <input
              type="text"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F9C]"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSelectedUserForEdit(null)}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-[#0B4F9C] hover:bg-[#083D7A] disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md transition-colors"
            >
              {submitting ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserManagement;
