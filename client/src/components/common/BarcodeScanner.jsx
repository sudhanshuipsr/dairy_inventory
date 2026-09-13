import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { 
  ScanBarcode, 
  Camera, 
  X, 
  SwitchCamera, 
  Zap, 
  ZapOff, 
  AlertCircle, 
  Keyboard, 
  Sparkles, 
  CheckCircle2, 
  RefreshCw,
  SlidersHorizontal,
  QrCode
} from 'lucide-react';

// Web Audio API POS scanner beep
const playScanBeep = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2100, ctx.currentTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {}
};

// Physical vibration feedback for mobile devices
const triggerHaptic = () => {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([60, 40, 60]);
    }
  } catch (e) {}
};

// Common demo barcodes for instant 1-click test simulation
const QUICK_TEST_BARCODES = [
  { code: '8901648001018', label: 'Mother Dairy Full Cream (1L)', icon: '🥛' },
  { code: '8901262020015', label: 'Amul Butter (500g)', icon: '🧈' },
  { code: '8904063251077', label: "Haldiram's Soan Papdi", icon: '🍬' },
  { code: '8901058852468', label: 'Maggi Masala Noodles', icon: '🍜' },
];

/**
 * Reusable Mobile Barcode & QR Scanner component powered by ZXing.
 * Supports 1D barcodes (EAN-13, EAN-8, UPC, Code 128) and 2D QR codes.
 *
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - onScan: (scannedCode: string) => void
 * - title?: string
 * - subtitle?: string
 */
const BarcodeScanner = ({
  isOpen,
  onClose,
  onScan,
  onScanSuccess,
  title = 'Scan Product Barcode',
  subtitle = 'Point camera at product barcode or QR code'
}) => {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null);
  const streamRef = useRef(null);

  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState(null); // 'permission_denied' | 'no_camera' | 'general'
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [reticleShape, setReticleShape] = useState('barcode'); // 'barcode' (wide 1D) | 'qr' (square 2D)
  const [manualCode, setManualCode] = useState('');
  const [scanningActive, setScanningActive] = useState(false);

  // Stop camera stream & release hardware
  const stopScanner = useCallback(() => {
    try {
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
    } catch (e) {}

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {}
        });
        streamRef.current = null;
      }
    } catch (e) {}

    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch (e) {}
    }

    setScanningActive(false);
    setTorchOn(false);
  }, []);

  // Handle detected barcode/QR string
  const handleCodeDetected = useCallback((resultText) => {
    const cleanText = (resultText || '').trim();
    if (!cleanText) return;

    playScanBeep();
    triggerHaptic();
    stopScanner();

    const scanCallback = onScan || onScanSuccess;
    if (scanCallback) {
      scanCallback(cleanText);
    }
  }, [onScan, onScanSuccess, stopScanner]);

  // Start scanner using @zxing/browser MultiFormatReader
  const startScanner = useCallback(async (deviceIdToUse = null) => {
    stopScanner();
    setCameraError(null);

    try {
      // 1. Enumerate available video input devices
      let videoDevices = [];
      try {
        videoDevices = await BrowserMultiFormatReader.listVideoInputDevices();
        setAvailableDevices(videoDevices || []);
      } catch (e) {
        console.warn('Camera device listing error:', e);
      }

      if (videoDevices && videoDevices.length === 0) {
        // Double check if mediaDevices is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError('no_camera');
          setHasCamera(false);
          return;
        }
      }

      // 2. Select back / environment camera by default
      let targetDeviceId = deviceIdToUse || selectedDeviceId;
      if (!targetDeviceId && videoDevices.length > 0) {
        const backCam = videoDevices.find((d) => {
          const l = (d.label || '').toLowerCase();
          return l.includes('back') || l.includes('rear') || l.includes('environment');
        });
        targetDeviceId = backCam ? backCam.deviceId : videoDevices[0].deviceId;
        setSelectedDeviceId(targetDeviceId);
      }

      // 3. Configure ZXing reader hints prioritizing 1D retail barcodes (EAN-13, EAN-8, UPC, Code 128)
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.ITF,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.DATA_MATRIX
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 80,
        delayBetweenScanSuccess: 800
      });
      readerRef.current = reader;

      if (!videoRef.current) return;

      // 4. Request camera stream with preferred facing mode or explicit deviceId
      const constraints = targetDeviceId
        ? {
            video: {
              deviceId: { exact: targetDeviceId },
              width: { min: 640, ideal: 1280, max: 1920 },
              height: { min: 480, ideal: 720, max: 1080 }
            }
          }
        : {
            video: {
              facingMode: { ideal: 'environment' },
              width: { min: 640, ideal: 1280, max: 1920 },
              height: { min: 480, ideal: 720, max: 1080 }
            }
          };

      // Native getUserMedia call to capture stream ref for torch capability and clean teardown
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Check torch capability
      try {
        const track = stream.getVideoTracks()[0];
        const caps = track?.getCapabilities?.();
        if (caps && 'torch' in caps) {
          setTorchSupported(true);
        } else {
          setTorchSupported(false);
        }
      } catch (e) {}

      // Attach stream to video element (with explicit iOS Safari inline attributes)
      if (videoRef.current) {
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        videoRef.current.muted = true;
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // 5. Start continuous decoding from the video element
      const controls = await reader.decodeFromVideoElement(videoRef.current, (result, error) => {
        if (result && result.getText()) {
          handleCodeDetected(result.getText());
        }
      });

      controlsRef.current = controls;
      setScanningActive(true);
      setHasCamera(true);
    } catch (err) {
      console.warn('Barcode scanner initialization error:', err);
      const errName = err.name || '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setCameraError('permission_denied');
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraError('no_camera');
      } else {
        setCameraError('general');
      }
      setScanningActive(false);
    }
  }, [selectedDeviceId, stopScanner, handleCodeDetected]);

  // Open / Close lifecycle
  useEffect(() => {
    if (isOpen) {
      setManualCode('');
      setCameraError(null);
      const timer = setTimeout(() => {
        startScanner();
      }, 200);

      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, startScanner, stopScanner]);

  // Switch between cameras (Rear vs Front)
  const handleSwitchCamera = async () => {
    if (availableDevices.length <= 1 || isSwitching) return;
    setIsSwitching(true);
    const currentIndex = availableDevices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % availableDevices.length;
    const nextDevice = availableDevices[nextIndex];
    setSelectedDeviceId(nextDevice.deviceId);
    await startScanner(nextDevice.deviceId);
    setIsSwitching(false);
  };

  // Toggle Torch / Flashlight
  const handleToggleTorch = async () => {
    if (!streamRef.current || !torchSupported) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      const nextState = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: nextState }]
      });
      setTorchOn(nextState);
    } catch (e) {
      console.warn('Failed to toggle flashlight:', e);
    }
  };

  // Manual fallback submission
  const handleManualSubmit = (e) => {
    if (e) e.preventDefault();
    const clean = manualCode.trim();
    if (!clean) return;
    handleCodeDetected(clean);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/80 backdrop-blur-md">
        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-700/70 rounded-3xl shadow-2xl overflow-hidden text-white"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ScanBarcode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>{title}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Live ZXing
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
              </div>
            </div>

            <button
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close scanner"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Viewfinder / Camera Screen */}
          <div className="relative bg-black aspect-4/3 sm:aspect-16/10 flex items-center justify-center overflow-hidden">
            {/* Live Video Element */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`w-full h-full object-cover ${cameraError ? 'hidden' : 'block'}`}
            />

            {/* Error States Overlay */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-3">
                  <AlertCircle className="w-6 h-6" />
                </div>

                <h4 className="text-sm font-bold text-slate-200 mb-1">
                  {cameraError === 'permission_denied'
                    ? 'Camera Permission Blocked'
                    : cameraError === 'no_camera'
                    ? 'No Camera Found'
                    : 'Camera Initialization Failed'}
                </h4>

                <p className="text-xs text-slate-400 max-w-xs mb-4">
                  {cameraError === 'permission_denied'
                    ? 'Browser camera permission was denied. Please allow camera access in your address bar / site settings, or enter the barcode manually below.'
                    : 'No compatible camera hardware detected. You can type or paste the product barcode manually below.'}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startScanner()}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Try Again</span>
                  </button>
                </div>
              </div>
            )}

            {/* Viewfinder Target Reticle (Shown when camera is active) */}
            {!cameraError && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                {/* Dark Vignette Overlay with transparent cutout */}
                <div
                  className={`relative transition-all duration-300 ${
                    reticleShape === 'barcode'
                      ? 'w-[88%] max-w-[340px] h-[130px]' // Wide horizontal rectangle for 1D retail barcodes
                      : 'w-[70%] max-w-[240px] h-[240px]' // Square for 2D QR codes
                  } border-2 border-emerald-400/90 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] overflow-hidden`}
                >
                  {/* Corner Accent Brackets */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl-sm" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr-sm" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl-sm" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br-sm" />

                  {/* Red / Emerald Animated Laser Beam Scan Line */}
                  <motion.div
                    animate={{ y: ['0%', '100%', '0%'] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399]"
                  />
                </div>

                {/* Framing Guidance Label */}
                <span className="mt-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-medium text-emerald-300 border border-emerald-500/30">
                  {reticleShape === 'barcode'
                    ? 'Align 1D retail barcode horizontally'
                    : 'Fit QR code within frame'}
                </span>
              </div>
            )}

            {/* Top In-Camera Action Buttons (Switch Camera, Torch, Reticle Toggle) */}
            {!cameraError && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                {/* 1D Barcode vs QR Code Reticle Toggle */}
                <button
                  type="button"
                  onClick={() => setReticleShape(reticleShape === 'barcode' ? 'qr' : 'barcode')}
                  className="p-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-all"
                  title={reticleShape === 'barcode' ? 'Switch to QR shape' : 'Switch to Barcode shape'}
                >
                  {reticleShape === 'barcode' ? (
                    <>
                      <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[10px] hidden sm:inline">1D Barcode</span>
                    </>
                  ) : (
                    <>
                      <ScanBarcode className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[10px] hidden sm:inline">QR Code</span>
                    </>
                  )}
                </button>

                {/* Torch / Flashlight Button */}
                {torchSupported && (
                  <button
                    type="button"
                    onClick={handleToggleTorch}
                    className={`p-2 rounded-xl backdrop-blur-md border text-xs transition-all ${
                      torchOn
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-black/60 hover:bg-black/80 border-white/15 text-slate-200'
                    }`}
                    title={torchOn ? 'Turn flashlight off' : 'Turn flashlight on'}
                  >
                    {torchOn ? <Zap className="w-3.5 h-3.5" /> : <ZapOff className="w-3.5 h-3.5" />}
                  </button>
                )}

                {/* Switch Camera Lens (Front vs Back) */}
                {availableDevices.length > 1 && (
                  <button
                    type="button"
                    onClick={handleSwitchCamera}
                    disabled={isSwitching}
                    className="p-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-slate-200 transition-all"
                    title="Switch camera lens"
                  >
                    <SwitchCamera className={`w-3.5 h-3.5 ${isSwitching ? 'animate-spin' : ''}`} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer & Fallback Manual Entry Section */}
          <div className="p-4 sm:p-5 bg-slate-900 border-t border-slate-800 space-y-3">
            {/* Fallback Manual Entry Barcode Input */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Keyboard className="w-3 h-3 text-slate-400" />
                  <span>Manual Barcode Entry (Fallback / USB Gun)</span>
                </span>
                <span className="text-[10px] text-slate-500 font-normal">Press Enter to lookup</span>
              </label>

              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="e.g. 8901648001018 or product code"
                  className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span>Submit Code</span>
                </button>
              </form>
            </div>

            {/* Quick Test Barcode Buttons for immediate testing */}
            <div>
              <span className="text-[10px] text-slate-400 block mb-1 font-medium">Quick Test Barcodes:</span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TEST_BARCODES.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handleCodeDetected(item.code)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10px] font-medium flex items-center gap-1 transition-colors"
                  >
                    <span>{item.icon}</span>
                    <span className="font-mono text-emerald-400">{item.code.slice(-6)}</span>
                    <span className="text-slate-400 hidden sm:inline">({item.label.split(' ')[0]})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BarcodeScanner;
