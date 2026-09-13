import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';
import { X, Printer, Download, QrCode } from 'lucide-react';

const QrGeneratorModal = ({ isOpen, onClose, product }) => {
  const svgRef = useRef(null);

  if (!isOpen || !product) return null;

  // 1. Rock-Solid Isolated Iframe Print for QR Sticker
  const handlePrint = () => {
    try {
      const existing = document.getElementById('qr-sticker-print-frame');
      if (existing) existing.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'qr-sticker-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const svgElement = svgRef.current?.querySelector('svg');
      const svgHtml = svgElement ? svgElement.outerHTML : '';

      const doc = iframe.contentWindow || iframe.contentDocument;
      const targetDoc = doc.document || doc;

      targetDoc.open();
      targetDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>QR Sticker - ${product.name}</title>
            <style>
              @page {
                size: auto;
                margin: 4mm;
              }
              * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
                color: #0f172a;
                background: #ffffff;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 8px;
              }
              .sticker-card {
                border: 2px dashed #94a3b8;
                border-radius: 12px;
                padding: 14px;
                text-align: center;
                width: 260px;
                background: #ffffff;
              }
              .brand {
                font-size: 11px;
                font-weight: 900;
                color: #0B4F9C;
                letter-spacing: 1px;
                text-transform: uppercase;
                margin-bottom: 6px;
              }
              .qr-container {
                display: inline-block;
                padding: 6px;
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                margin-bottom: 6px;
              }
              .product-name {
                font-size: 12px;
                font-weight: 800;
                color: #0f172a;
                margin-top: 4px;
                line-height: 1.25;
              }
              .code-val {
                font-family: monospace;
                font-size: 11px;
                font-weight: 900;
                color: #0B4F9C;
                margin-top: 2px;
              }
              .meta-line {
                font-size: 10px;
                font-weight: 700;
                color: #475569;
                margin-top: 3px;
              }
            </style>
          </head>
          <body>
            <div class="sticker-card">
              <div class="brand">Mother Dairy</div>
              <div class="qr-container">
                ${svgHtml}
              </div>
              <div class="product-name">${product.name}</div>
              <div class="code-val">${product.qrCode || product.barcode || ''}</div>
              <div class="meta-line">
                Rs. ${Number(product.unitPrice || 0).toFixed(2)} / ${product.unit || 'unit'} • ${product.category || 'Dairy'}
              </div>
            </div>
          </body>
        </html>
      `);
      targetDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (err) {
          console.warn('Iframe print error fallback:', err);
          window.print();
        }
      }, 300);
    } catch (e) {
      console.error('Print QR sticker error:', e);
      window.print();
    }
  };

  // 2. Download QR Code as PNG Image
  const handleDownloadImage = () => {
    try {
      const svgElement = svgRef.current?.querySelector('svg');
      if (!svgElement) return;

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 400, 400);
        ctx.drawImage(img, 20, 20, 360, 360);

        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `QR_${product.qrCode || product.name || 'product'}.png`;
        link.href = pngUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    } catch (err) {
      console.error('Download QR image error:', err);
      alert('Could not export QR image directly.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-3xl max-w-sm w-full p-6 text-slate-900 shadow-2xl border border-slate-200 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-blue-50 text-[#0B4F9C]">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900">Product QR Sticker</h3>
            <p className="text-[11px] text-slate-500">Scan code to auto-populate product forms</p>
          </div>
        </div>

        {/* Printable Label Card */}
        <div 
          id="printable-qr-sticker"
          className="bg-[#FAF8F5] p-5 rounded-2xl border-2 border-dashed border-slate-300 text-center space-y-3"
        >
          <div className="font-black text-xs uppercase tracking-widest text-[#0B4F9C]">
            DAIRY INVENTORY SYSTEM
          </div>

          <div ref={svgRef} className="p-3 bg-white rounded-2xl border border-slate-200 inline-block shadow-sm">
            <QRCodeSVG
              value={product.qrCode || product.barcode || String(product.id || 'MD-000')}
              size={180}
              level="H"
              includeMargin={true}
              fgColor="#0B4F9C"
            />
          </div>

          <div>
            <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
              {product.name}
            </h4>
            <div className="text-xs font-mono font-black text-[#0B4F9C] mt-0.5">
              {product.qrCode || product.barcode}
            </div>
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 font-bold mt-1">
              <span>₹{product.unitPrice} / {product.unit}</span>
              <span>•</span>
              <span className="capitalize">{product.category}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-5">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-[#0B4F9C] hover:bg-[#083D7A] text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            title="Print Sticker directly"
          >
            <Printer className="w-4 h-4" />
            <span>Print Sticker</span>
          </button>
          <button
            onClick={handleDownloadImage}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            title="Download QR code image (PNG)"
          >
            <Download className="w-4 h-4" />
            <span>PNG</span>
          </button>
          <button
            onClick={onClose}
            className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default QrGeneratorModal;
