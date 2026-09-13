import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Boxes, 
  ShoppingCart, 
  ShoppingBag, 
  Factory, 
  Clock, 
  FileText, 
  Users, 
  History, 
  LogOut, 
  Package, 
  ShieldCheck, 
  Sparkles,
  QrCode,
  Building2,
  Store,
  Download,
  Upload,
  Star
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isMobileOpen, onCloseMobile }) => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Navigation Items Configured by Role
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, role: 'all' },
    { label: 'Product Catalog & QR', path: '/products', icon: Package, role: 'all' },
    { label: 'Live Stock', path: '/stock', icon: Boxes, role: 'all', badge: 'Auto' },
    { label: 'Purchases (Inward)', path: '/purchases', icon: ShoppingBag, role: 'all' },
    { label: 'Sales (Outward)', path: '/sales', icon: ShoppingCart, role: 'all' },
    { label: 'Expiry Batches', path: '/expiry', icon: Clock, role: 'all', badge: '3-Day' },
    // Admin Only Navigation Links
    { label: 'Customer Reviews', path: '/feedback-admin', icon: Star, role: 'admin', badge: '⭐ 4.9' },
    { label: 'Data Hub (Up/Download)', path: '/data-hub', icon: Download, role: 'admin', badge: 'Hub' },
    { label: 'Financial Reports', path: '/reports', icon: FileText, role: 'admin' },
    { label: 'Staff Accounts', path: '/users', icon: Users, role: 'admin' },
    { label: 'Audit Trail Logs', path: '/audit-logs', icon: History, role: 'admin' }
  ];

  const filteredNav = navItems.filter((item) => item.role === 'all' || (item.role === 'admin' && isAdmin));

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-[#a0c396]/30 p-4 flex flex-col justify-between shadow-soft transition-transform duration-300 md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-5">
          {/* Logo & Brand Header */}
          <div className="flex items-center gap-3 px-2 py-2">
            <img 
              src="/logo.png" 
              alt="Mother Dairy Rajajipuram" 
              className="w-10 h-10 object-contain rounded-full shadow-sm shrink-0 border border-[#a0c396]/40" 
            />
            <div>
              <div className="font-serif font-bold text-base text-[#1e3a1e] tracking-tight leading-none">
                Mother Dairy
              </div>
              <div className="text-[10px] text-[#2d4a2d] font-bold mt-0.5 uppercase tracking-wider">
                Rajajipuram Outlet
              </div>
            </div>
          </div>

          {/* User Account Role Card */}
          <div className="bg-[#f4f8f2] p-3.5 rounded-2xl border border-[#a0c396]/35 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#ebf5eb] text-[#2d4a2d] flex items-center justify-center font-bold text-xs flex-shrink-0 border border-[#a0c396]/30">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="truncate">
                <div className="font-bold text-xs text-[#1e3a1e] truncate">{user?.name}</div>
                <div className="text-[10px] text-[#3f5a3f] font-medium capitalize flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#6a9c6a]" />
                  <span>{user?.role === 'admin' ? 'Outlet Admin' : 'Dairy Staff'}</span>
                </div>
              </div>
            </div>

            <span
              className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                isAdmin
                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                  : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
              }`}
            >
              {user?.role}
            </span>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1 no-scrollbar">
            {filteredNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-[#1e3a1e] text-[#f8f5f0] shadow-md shadow-[#1e3a1e]/20 font-bold'
                        : 'text-[#3f5a3f] hover:bg-[#f4f8f2] hover:text-[#1e3a1e]'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#6a9c6a]/30 text-white">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <NavLink
            to="/"
            className="w-full py-2 px-3 bg-[#f4f8f2] hover:bg-[#ebf5eb] text-[#2d4a2d] rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-[#a0c396]/30 transition-colors"
          >
            <Store className="w-3.5 h-3.5 text-[#6a9c6a]" />
            <span>Store Front</span>
          </NavLink>

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-rose-200 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

    </>
  );
};

export default Sidebar;
