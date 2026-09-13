import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  Smartphone, 
  Share, 
  PlusSquare, 
  CheckCircle2, 
  X, 
  Sparkles, 
  Zap, 
  ShoppingCart, 
  WifiOff 
} from 'lucide-react';

const PwaAutoInstallModal = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // 1. Check if already installed & running in standalone mode
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 3. Listen for native browser beforeinstallprompt (Android / Chrome / Edge)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      window.deferredPwaPrompt = e;
      
      // Auto open modal immediately when install event is available
      const dismissed = sessionStorage.getItem('md_pwa_dismissed');
      if (!dismissed) {
        setIsOpen(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsOpen(false);
      setDeferredPrompt(null);
      window.deferredPwaPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 4. Auto-trigger modal on site open (500ms delay for smooth page entrance)
    const timer = setTimeout(() => {
      const dismissed = sessionStorage.getItem('md_pwa_dismissed');
      if (!isStandalone && !dismissed) {
        setIsOpen(true);
      }
    }, 600);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || window.deferredPwaPrompt;

    if (promptEvent) {
      try {
        promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === 'accepted') {
          setInstalledSuccess(true);
          setTimeout(() => {
            setIsOpen(false);
            setIsInstalled(true);
          }, 1800);
        }
      } catch (err) {
        console.warn('PWA install prompt error:', err);
      }
      setDeferredPrompt(null);
      window.deferredPwaPrompt = null;
    } else if (isIOS) {
      // iOS users will see the 2-step instructional guide inside the modal
    } else {
      // Android / Chrome fallback when browser delayed beforeinstallprompt
      alert('To install the Mother Dairy App:\n1. Tap the three dots (⋮) in your browser menu.\n2. Tap "Install app" or "Add to Home screen".');
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('md_pwa_dismissed', 'true');
    setIsOpen(false);
  };

  if (isInstalled) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-md animate-fadeIn">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900"
          >
            {/* Top decorative banner */}
            <div className="bg-gradient-to-r from-[#1e3a1e] via-[#244924] to-[#0B4F9C] p-6 text-white text-center relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
              <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-emerald-400/10 rounded-full blur-xl pointer-events-none" />

              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white/90 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {/* App Icon preview */}
              <div className="w-16 h-16 mx-auto rounded-2xl bg-white p-2 shadow-lg flex items-center justify-center border-2 border-white/80 transform -rotate-2 hover:rotate-0 transition-transform">
                <img
                  src="/icon-192.png"
                  alt="Mother Dairy ERP"
                  className="w-full h-full object-contain rounded-xl"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentNode.innerHTML = '<span class="text-3xl">🥛</span>';
                  }}
                />
              </div>

              <h2 className="text-lg font-black mt-3 tracking-tight flex items-center justify-center gap-1.5">
                <span>Install Mother Dairy ERP</span>
                <Sparkles className="w-4 h-4 text-amber-300" />
              </h2>
              <p className="text-xs text-emerald-100/90 font-medium mt-1">
                Official Web Application & Inventory POS
              </p>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-5">
              {installedSuccess ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="font-extrabold text-base text-slate-800">Installation Started!</h3>
                  <p className="text-xs text-slate-500">
                    Mother Dairy ERP is adding to your home screen. Launch it anytime from your apps list.
                  </p>
                </div>
              ) : (
                <>
                  {/* Feature Highlights */}
                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-100/80 space-y-1">
                      <Zap className="w-5 h-5 text-emerald-700 mx-auto" />
                      <p className="text-[11px] font-bold text-slate-800">Fast Launch</p>
                      <p className="text-[9px] text-slate-500">Instant offline access</p>
                    </div>

                    <div className="p-3 rounded-2xl bg-blue-50/80 border border-blue-100/80 space-y-1">
                      <ShoppingCart className="w-5 h-5 text-[#0B4F9C] mx-auto" />
                      <p className="text-[11px] font-bold text-slate-800">Fast POS</p>
                      <p className="text-[9px] text-slate-500">Quick counter billing</p>
                    </div>

                    <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-100/80 space-y-1">
                      <Smartphone className="w-5 h-5 text-amber-700 mx-auto" />
                      <p className="text-[11px] font-bold text-slate-800">Full Screen</p>
                      <p className="text-[9px] text-slate-500">Native app feel</p>
                    </div>
                  </div>

                  {/* iOS Safari Instructions */}
                  {isIOS ? (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                      <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-[#0B4F9C]" />
                        <span>How to install on iPhone / iPad:</span>
                      </p>
                      <div className="space-y-2 text-[11px] text-slate-600 font-medium">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-black flex items-center justify-center">1</span>
                          <span>Tap the <strong className="text-slate-800">Share</strong> button <Share className="w-3.5 h-3.5 inline text-[#0B4F9C]" /> at bottom of Safari</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-black flex items-center justify-center">2</span>
                          <span>Scroll down and tap <strong className="text-slate-800">Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline text-emerald-700" /></span>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Actions */}
                  <div className="space-y-2 pt-1">
                    <button
                      onClick={handleInstallClick}
                      className="w-full py-3.5 px-4 bg-[#1e3a1e] hover:bg-[#162c16] active:scale-[0.98] text-white rounded-2xl font-black text-sm shadow-lg shadow-[#1e3a1e]/25 transition-all flex items-center justify-center gap-2 group"
                    >
                      <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                      <span>{isIOS ? 'Got It, Add to Home Screen' : '📲 Install App on Device'}</span>
                    </button>

                    <button
                      onClick={handleDismiss}
                      className="w-full py-2.5 px-4 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Continue in Browser
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PwaAutoInstallModal;
