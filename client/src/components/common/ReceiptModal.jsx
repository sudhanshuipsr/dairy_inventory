import React, { useRef } from 'react';
import { Printer, Download, X, CheckCircle2, ShoppingBag, CreditCard, Calendar, User, Store } from 'lucide-react';
import { jsPDF } from 'jspdf';

const ReceiptModal = ({ isOpen, onClose, sale }) => {
  const receiptRef = useRef(null);

  if (!isOpen || !sale) return null;

  const receiptNumber = sale.receiptNumber || `REC-${sale.id || '0000'}`;
  const saleDate = sale.date ? new Date(sale.date) : new Date();
  const formattedDate = saleDate.toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  const formattedTime = saleDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const items = Array.isArray(sale.items) && sale.items.length > 0
    ? sale.items
    : [
        {
          product: sale.product || { name: 'Item', unit: 'unit' },
          quantity: sale.quantity || 1,
          sellingPrice: sale.sellingPrice || sale.totalAmount || 0,
          subtotal: sale.totalAmount || 0
        }
      ];

  const subtotal = Number(sale.subtotal || sale.totalAmount || 0);
  const discount = Number(sale.discount || 0);
  const totalAmount = Number(sale.totalAmount || 0);
  const customerName = sale.customerName || 'Walk-in Customer';
  const paymentMode = sale.paymentMode || 'Cash';
  const cashierName = sale.user?.name || sale.addedBy?.name || 'Authorized Staff';

  // 1. Download PDF using jsPDF
  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5' // A5 size is ideal for thermal & counter receipts
      });

      // Header Branding
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(11, 79, 156); // Mother Dairy Blue
      doc.text('MOTHER DAIRY', 74, 16, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Dairy Inventory & Outward Counter System', 74, 21, { align: 'center' });
      doc.text('Sector 18 Market, New Delhi - 110001 | GSTIN: 07AAACM1234F1Z8', 74, 25, { align: 'center' });
      doc.text('Helpline: 1800-180-1989 | support@motherdairy.com', 74, 29, { align: 'center' });

      // Divider
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(10, 32, 138, 32);

      // Receipt Metadata
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(`RECEIPT: ${receiptNumber}`, 10, 38);
      doc.text(`DATE: ${formattedDate} ${formattedTime}`, 138, 38, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`Customer: ${customerName}`, 10, 43);
      doc.text(`Payment: ${paymentMode}`, 138, 43, { align: 'right' });
      doc.text(`Cashier / Staff: ${cashierName}`, 10, 48);
      doc.text(`Outlet: ${sale.outletOrRoute || 'Main Dairy Counter'}`, 138, 48, { align: 'right' });

      // Table Header
      let y = 54;
      doc.setFillColor(241, 245, 249);
      doc.rect(10, y, 128, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text('#', 12, y + 4.8);
      doc.text('ITEM DESCRIPTION', 20, y + 4.8);
      doc.text('QTY', 85, y + 4.8, { align: 'right' });
      doc.text('RATE (Rs)', 110, y + 4.8, { align: 'right' });
      doc.text('TOTAL (Rs)', 136, y + 4.8, { align: 'right' });

      // Line Items
      y += 9;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);

      items.forEach((item, index) => {
        const prodName = item.product?.name || item.productId?.name || 'Dairy Item';
        const unit = item.product?.unit || item.productId?.unit || 'unit';
        const qtyStr = `${item.quantity} ${unit}`;
        const rateStr = `Rs ${Number(item.sellingPrice).toFixed(2)}`;
        const lineTotStr = `Rs ${Number(item.subtotal || item.quantity * item.sellingPrice).toFixed(2)}`;

        doc.text(String(index + 1), 12, y);
        doc.text(prodName.length > 32 ? prodName.slice(0, 32) + '...' : prodName, 20, y);
        doc.text(qtyStr, 85, y, { align: 'right' });
        doc.text(rateStr, 110, y, { align: 'right' });
        doc.text(lineTotStr, 136, y, { align: 'right' });
        y += 6;
      });

      // Divider
      doc.setDrawColor(203, 213, 225);
      doc.line(10, y + 1, 138, y + 1);
      y += 6;

      // Summary Breakdown
      doc.setFontSize(8.5);
      doc.text('Subtotal:', 95, y, { align: 'right' });
      doc.text(`Rs ${subtotal.toFixed(2)}`, 136, y, { align: 'right' });
      y += 5;

      if (discount > 0) {
        doc.setTextColor(22, 101, 52); // green
        doc.text(`Discount (${((discount / (subtotal || 1)) * 100).toFixed(0)}%):`, 95, y, { align: 'right' });
        doc.text(`- Rs ${discount.toFixed(2)}`, 136, y, { align: 'right' });
        y += 5;
        doc.setTextColor(30, 41, 59);
      }

      // Grand Total Highlight
      doc.setFillColor(240, 253, 244);
      doc.rect(70, y - 1, 68, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(22, 101, 52);
      doc.text('NET TOTAL:', 95, y + 4.8, { align: 'right' });
      doc.text(`Rs ${totalAmount.toFixed(2)}`, 136, y + 4.8, { align: 'right' });

      // Footer
      y += 18;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('*** Computer Generated Tax Invoice / Cash Memo ***', 74, y, { align: 'center' });
      doc.text('Keep refrigerated below 4°C. Goods once sold are non-returnable.', 74, y + 4, { align: 'center' });
      doc.text('Thank you for your visit to Mother Dairy!', 74, y + 8, { align: 'center' });

      doc.save(`MotherDairy_Receipt_${receiptNumber}.pdf`);
    } catch (e) {
      console.error('PDF generation error:', e);
      alert('Could not download PDF. Please use the Print button.');
    }
  };

  // 2. Direct Browser Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      {/* Print Specific CSS to Isolate Receipt */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 16px;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Control Bar */}
        <div className="no-print px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm tracking-tight">Receipt Generated</h3>
              <p className="text-[10px] text-slate-400 font-mono">{receiptNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Print Receipt (Ctrl+P)"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-400" />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Download PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
          {/* Authentic POS Receipt Slip */}
          <div
            id="printable-receipt"
            ref={receiptRef}
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-md border border-slate-200/90 text-slate-800 font-sans space-y-4"
          >
            {/* Header / Brand */}
            <div className="text-center pb-3 border-b-2 border-dashed border-slate-300">
              <div className="inline-flex items-center justify-center w-11 h-11 bg-blue-50 text-[#0B4F9C] rounded-2xl mb-1 border border-blue-100">
                <Store className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black tracking-tight text-[#0B4F9C]">MOTHER DAIRY</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Dairy Inventory & Outward Counter
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Sector 18 Market, New Delhi - 110001 • Ph: 1800-180-1989
              </p>
              <p className="text-[9px] text-slate-400 font-mono">GSTIN: 07AAACM1234F1Z8</p>
            </div>

            {/* Receipt Meta Details */}
            <div className="text-xs space-y-1 py-1 border-b border-dashed border-slate-200">
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">Receipt No:</span>
                <span className="font-mono font-black text-slate-900">{receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Time:</span>
                <span className="font-medium text-slate-700">{formattedDate} {formattedTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-900">{customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Outlet / Counter:</span>
                <span className="font-medium text-slate-700">{sale.outletOrRoute || 'Counter POS'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cashier:</span>
                <span className="font-medium text-slate-700">{cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-bold text-emerald-700">{paymentMode}</span>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="pt-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase font-black text-slate-400 border-b border-slate-200 pb-1">
                    <th className="py-1">Item</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Rate</th>
                    <th className="py-1 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {items.map((it, idx) => {
                    const name = it.product?.name || it.productId?.name || 'Dairy Product';
                    const unit = it.product?.unit || it.productId?.unit || 'unit';
                    const lineTotal = Number(it.subtotal || it.quantity * it.sellingPrice);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 pr-2">
                          <div className="font-bold text-slate-900 leading-snug">{name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {it.product?.barcode || it.product?.qrCode || ''}
                          </div>
                        </td>
                        <td className="py-2 text-center text-slate-700 whitespace-nowrap font-bold">
                          {it.quantity} {unit}
                        </td>
                        <td className="py-2 text-right text-slate-600 whitespace-nowrap">
                          ₹{Number(it.sellingPrice).toFixed(2)}
                        </td>
                        <td className="py-2 text-right font-black text-slate-900 whitespace-nowrap">
                          ₹{lineTotal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="space-y-1.5 pt-2 border-t-2 border-dashed border-slate-300 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Items Subtotal:</span>
                <span className="font-bold font-mono">₹{subtotal.toFixed(2)}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Special Discount:</span>
                  <span className="font-mono">-₹{discount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                <span className="text-sm font-black text-slate-900">Total Net Amount:</span>
                <span className="text-xl font-black text-emerald-800 font-mono">
                  ₹{totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Simulated Barcode for Receipt */}
            <div className="pt-3 text-center border-t border-dashed border-slate-200 space-y-1">
              <div className="h-8 flex items-center justify-center gap-0.5 opacity-70">
                {[4, 2, 6, 2, 8, 3, 5, 2, 7, 3, 2, 6, 3, 8, 2, 5, 3, 7, 2, 4, 3, 6, 2, 8, 3, 5, 2, 6, 4].map((w, i) => (
                  <div
                    key={i}
                    className="bg-slate-900 h-full"
                    style={{ width: `${w * 0.75}px` }}
                  />
                ))}
              </div>
              <p className="text-[10px] font-mono tracking-widest text-slate-500 font-bold">
                {receiptNumber}
              </p>
            </div>

            {/* Footer Terms */}
            <div className="text-center pt-2 text-[9px] text-slate-400 space-y-0.5">
              <p>Keep milk and paneer refrigerated below 4°C at all times.</p>
              <p>Goods once sold are non-returnable.</p>
              <p className="font-bold text-slate-600 mt-1">Thank you for choosing Mother Dairy!</p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions (for Mobile / Easy Tap) */}
        <div className="no-print p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-[#0B4F9C] border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
