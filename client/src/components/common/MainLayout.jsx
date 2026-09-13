import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import BarcodeScanner from './BarcodeScanner';
import { useAuth } from '../../context/AuthContext';


const MainLayout = () => {
  const { user, initialLoading } = useAuth();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Global Quick Scan handler (navigates to sales with scanned barcode)
  const handleGlobalScan = (scannedCode) => {
    setIsScannerOpen(false);
    window.location.href = `/sales?code=${encodeURIComponent(scannedCode)}`;
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[#f4f8f2] flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <img 
            src="/logo.png" 
            alt="Mother Dairy" 
            className="w-16 h-16 object-contain rounded-full animate-bounce mx-auto shadow-lg border-2 border-[#a0c396]/40" 
          />
          <p className="text-xs font-bold text-[#1e3a1e]">Loading Mother Dairy Rajajipuram Workspace...</p>
        </div>
      </div>
    );
  }

  // If not logged in, redirect to login page using React Router Navigate component
  if (!user) {
    return <Navigate to="/login" replace />;
  }


  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-900 flex font-sans">
      {/* 1. Sidebar Navigation */}
      <Sidebar
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 md:ml-64 flex flex-col min-w-0 min-h-screen">
        <Navbar
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          onOpenScanner={() => setIsScannerOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* 3. Global Barcode & QR Scanner powered by ZXing */}
      <BarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleGlobalScan}
        title="ZXing Barcode & QR Scanner"
        subtitle="Point camera at barcode to look up or add into sale/purchase"
      />
    </div>
  );
};

export default MainLayout;
