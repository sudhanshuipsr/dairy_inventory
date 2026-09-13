import React, { useState, useEffect } from 'react';
import { Menu, ScanBarcode, QrCode, Sparkles, Clock, Bell, Download, Smartphone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Navbar = ({ onOpenMobileMenu, onOpenScanner }) => {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (installed PWA)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true);
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Fallback instructions for iOS or already supported browsers
      alert('To install this app on your phone:\n\n• Android: Tap browser menu (⋮) and tap "Install app" or "Add to Home Screen".\n• iPhone/iPad: Tap the Share button (⎋) in Safari and choose "Add to Home Screen".');
    }
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#a0c396]/30 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 shadow-xs">
      {/* Mobile Hamburger & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl text-[#2d4a2d] hover:bg-[#f4f8f2] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <img 
            src="/logo.png" 
            alt="Mother Dairy" 
            className="w-7 h-7 object-contain rounded-full shadow-2xs border border-[#a0c396]/40" 
          />
          <span className="text-xs font-bold text-[#1e3a1e] tracking-tight hidden sm:inline">
            Mother Dairy Rajajipuram •
          </span>
          <span className="text-xs text-[#3f5a3f] font-medium">
            {today}
          </span>
        </div>
      </div>

      {/* Right Controls: Install App, Barcode Scanner Quick Launch & User Pill */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* PWA Install Button */}
        {!isInstalled && (
          <button
            onClick={handleInstallClick}
            className="px-3 py-2 bg-[#f4f8f2] hover:bg-emerald-50 text-emerald-900 border border-emerald-300/80 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs hover:scale-105 active:scale-95"
            title="Install Mother Dairy Outlet PWA App on Phone or PC"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
            <span className="hidden sm:inline">Install App</span>
            <span className="sm:hidden">Install</span>
          </button>
        )}

        {/* Quick Barcode Scanner Button */}
        <button
          onClick={onOpenScanner}
          className="px-3.5 sm:px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-full text-xs font-black shadow-md shadow-emerald-900/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 border border-emerald-700/50"
          title="Open Barcode Scanner (Inward Stock)"
        >
          <ScanBarcode className="w-4 h-4 text-emerald-300" />
          <span className="hidden sm:inline">Barcode Scanner</span>
          <span className="sm:hidden">Barcode</span>
        </button>

        {/* User Info Tag */}
        <div className="flex items-center gap-2 bg-[#f4f8f2] border border-[#a0c396]/40 py-1.5 px-3 rounded-full text-xs">
          <div className="w-6 h-6 rounded-full bg-[#1e3a1e] text-[#f8f5f0] flex items-center justify-center font-bold text-[10px]">
            {user?.name?.charAt(0)}
          </div>
          <span className="font-bold text-[#1e3a1e] hidden md:inline max-w-[120px] truncate">
            {user?.name}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
