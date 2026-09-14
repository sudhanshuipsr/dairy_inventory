import React, { useRef } from 'react';
import { Printer, Download, X, CheckCircle2, Store } from 'lucide-react';
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
          product: sale.product || { name: 'Dairy Item', unit: 'unit' },
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
  const outletName = sale.outletOrRoute || 'Main Dairy Counter';

  // 1. Download PDF using jsPDF with safe pagination and clear currency symbols
  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5' // A5 size: 148mm x 210mm
      });

      const printHeader = (pageNum = 1) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(11, 79, 156); // Mother Dairy Blue
        doc.text('MOTHER DAIRY', 74, 15, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Dairy Inventory & Outward Counter System', 74, 20, { align: 'center' });
        doc.text('C-3383, Opposite SBI ATM, Near MIS Chauraha, Rajajipuram, Lucknow - 226017', 74, 24, { align: 'center' });
        doc.text('Email: sudhanshuipsr@gmail.com | Helpline: 1800-180-1018', 74, 28, { align: 'center' });

        // Divider
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        doc.line(10, 31, 138, 31);

        // Metadata
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.text(`RECEIPT: ${receiptNumber}`, 10, 36);
        doc.text(`DATE: ${formattedDate} ${formattedTime}`, 138, 36, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`Customer: ${customerName}`, 10, 41);
        doc.text(`Payment: ${paymentMode}`, 138, 41, { align: 'right' });
        doc.text(`Cashier: ${cashierName}`, 10, 46);
        doc.text(`Outlet: ${outletName}`, 138, 46, { align: 'right' });

        // Table Header
        let tableHeaderY = 51;
        doc.setFillColor(241, 245, 249);
        doc.rect(10, tableHeaderY, 128, 6.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);
        doc.text('#', 12, tableHeaderY + 4.5);
        doc.text('ITEM DESCRIPTION', 20, tableHeaderY + 4.5);
        doc.text('QTY', 85, tableHeaderY + 4.5, { align: 'right' });
        doc.text('RATE (Rs)', 110, tableHeaderY + 4.5, { align: 'right' });
        doc.text('TOTAL (Rs)', 136, tableHeaderY + 4.5, { align: 'right' });
      };

      printHeader(1);

      // Line Items
      let y = 63;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);

      items.forEach((item, index) => {
        // Page break if overflowing A5 height
        if (y > 175) {
          doc.addPage();
          printHeader(doc.internal.getNumberOfPages());
          y = 63;
        }

        const prodName = item.product?.name || item.productId?.name || 'Dairy Item';
        const unit = item.product?.unit || item.productId?.unit || 'unit';
        const qtyStr = `${item.quantity} ${unit}`;
        const rateStr = `Rs ${Number(item.sellingPrice || 0).toFixed(2)}`;
        const lineTotStr = `Rs ${Number(item.subtotal || item.quantity * item.sellingPrice || 0).toFixed(2)}`;

        doc.text(String(index + 1), 12, y);
        doc.text(prodName.length > 30 ? prodName.slice(0, 30) + '...' : prodName, 20, y);
        doc.text(qtyStr, 85, y, { align: 'right' });
        doc.text(rateStr, 110, y, { align: 'right' });
        doc.text(lineTotStr, 136, y, { align: 'right' });
        y += 5.5;
      });

      // Divider
      doc.setDrawColor(203, 213, 225);
      doc.line(10, y + 1, 138, y + 1);
      y += 6;

      // Summary Breakdown
      doc.setFontSize(8.5);
      doc.text('Items Subtotal:', 95, y, { align: 'right' });
      doc.text(`Rs ${subtotal.toFixed(2)}`, 136, y, { align: 'right' });
      y += 5;

      if (discount > 0) {
        doc.setTextColor(22, 101, 52); // Green
        doc.text(`Discount:`, 95, y, { align: 'right' });
        doc.text(`- Rs ${discount.toFixed(2)}`, 136, y, { align: 'right' });
        y += 5;
        doc.setTextColor(30, 41, 59);
      }

      // Grand Total Box
      doc.setFillColor(240, 253, 244);
      doc.rect(70, y - 1, 68, 8, 'F');
      doc.setDrawColor(187, 247, 208);
      doc.rect(70, y - 1, 68, 8, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(22, 101, 52);
      doc.text('NET TOTAL:', 95, y + 4.8, { align: 'right' });
      doc.text(`Rs ${totalAmount.toFixed(2)}`, 136, y + 4.8, { align: 'right' });

      // Footer
      y += 16;
      if (y > 195) {
        doc.addPage();
        y = 25;
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('*** Computer Generated Tax Invoice / Cash Memo ***', 74, y, { align: 'center' });
      doc.text('Keep refrigerated below 4°C. Goods once sold are non-returnable.', 74, y + 3.8, { align: 'center' });
      doc.text('Thank you for choosing Mother Dairy!', 74, y + 7.6, { align: 'center' });

      doc.save(`MotherDairy_Receipt_${receiptNumber}.pdf`);
    } catch (e) {
      console.error('PDF generation error:', e);
      alert('Could not generate PDF. Please use the Print Slip button.');
    }
  };

  // 2. Rock-Solid Isolated Iframe Print
  const handlePrint = () => {
    try {
      const existingIframe = document.getElementById('receipt-print-frame');
      if (existingIframe) {
        existingIframe.remove();
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'receipt-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const itemsHtml = items.map((it, idx) => {
        const name = it.product?.name || it.productId?.name || 'Dairy Product';
        const code = it.product?.qrCode || '';
        const unit = it.product?.unit || it.productId?.unit || 'unit';
        const lineTotal = Number(it.subtotal || it.quantity * it.sellingPrice || 0);
        return `
          <tr>
            <td style="padding: 5px 2px; vertical-align: top; border-bottom: 1px solid #f1f5f9;">
              <div style="font-weight: 700; color: #0f172a; font-size: 11px;">${name}</div>
              ${code ? `<div style="font-size: 9px; color: #64748b; font-family: monospace;">${code}</div>` : ''}
            </td>
            <td style="padding: 5px 2px; text-align: center; font-weight: 700; border-bottom: 1px solid #f1f5f9; font-size: 11px;">
              ${it.quantity} ${unit}
            </td>
            <td style="padding: 5px 2px; text-align: right; color: #475569; border-bottom: 1px solid #f1f5f9; font-size: 11px;">
              Rs. ${Number(it.sellingPrice || 0).toFixed(2)}
            </td>
            <td style="padding: 5px 2px; text-align: right; font-weight: 800; color: #0f172a; border-bottom: 1px solid #f1f5f9; font-size: 11px;">
              Rs. ${lineTotal.toFixed(2)}
            </td>
          </tr>
        `;
      }).join('');

      const doc = iframe.contentWindow || iframe.contentDocument;
      const targetDoc = doc.document || doc;

      targetDoc.open();
      targetDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Receipt ${receiptNumber} - Mother Dairy</title>
            <style>
              @page {
                size: auto;
                margin: 6mm 8mm;
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
                width: 100%;
                max-width: 360px;
                margin: 0 auto;
                padding: 10px;
                font-size: 11px;
                line-height: 1.35;
              }
              .center { text-align: center; }
              .brand-title {
                font-size: 18px;
                font-weight: 900;
                color: #0B4F9C;
                letter-spacing: -0.5px;
              }
              .brand-sub {
                font-size: 9.5px;
                font-weight: 700;
                color: #475569;
                text-transform: uppercase;
                letter-spacing: 0.8px;
                margin-top: 1px;
              }
              .brand-address {
                font-size: 9px;
                color: #64748b;
                margin-top: 2px;
              }
              .divider {
                border-top: 1px dashed #cbd5e1;
                margin: 7px 0;
              }
              .divider-thick {
                border-top: 2px dashed #94a3b8;
                margin: 7px 0;
              }
              .row {
                display: flex;
                justify-content: space-between;
                font-size: 10.5px;
                margin-bottom: 2px;
              }
              .label { color: #64748b; }
              .val { font-weight: 600; color: #0f172a; }
              .val-bold { font-weight: 800; font-family: monospace; }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 6px 0;
              }
              th {
                text-align: left;
                font-size: 9px;
                text-transform: uppercase;
                font-weight: 800;
                color: #64748b;
                border-bottom: 1px solid #cbd5e1;
                padding: 4px 2px;
              }
              .total-box {
                background: #f0fdf4;
                border: 1px solid #bbf7d0;
                border-radius: 6px;
                padding: 6px 8px;
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                margin-top: 6px;
              }
              .total-title {
                font-size: 12px;
                font-weight: 900;
                color: #14532d;
              }
              .total-val {
                font-size: 16px;
                font-weight: 900;
                color: #166534;
                font-family: monospace;
              }
              .receipt-tag {
                text-align: center;
                margin-top: 10px;
                padding-top: 8px;
                border-top: 1px dashed #cbd5e1;
                font-family: monospace;
                font-size: 9.5px;
                font-weight: 700;
                color: #64748b;
              }
              .footer-msg {
                text-align: center;
                font-size: 8.5px;
                color: #64748b;
                margin-top: 8px;
                line-height: 1.35;
              }
            </style>
          </head>
          <body>
            <div class="center">
              <div class="brand-title">MOTHER DAIRY</div>
              <div class="brand-sub">Dairy Inventory & Outward Counter</div>
              <div class="brand-address">C-3383, Opposite SBI ATM, Near MIS Chauraha, Rajajipuram, Lucknow - 226017</div>
              <div class="brand-address">Email: sudhanshuipsr@gmail.com • Ph: 1800-180-1018</div>
            </div>

            <div class="divider-thick"></div>

            <div class="row">
              <span class="label">Receipt No:</span>
              <span class="val font-mono">${receiptNumber}</span>
            </div>
            <div class="row">
              <span class="label">Date & Time:</span>
              <span class="val">${dateFormatted}</span>
            </div>
            <div class="row">
              <span class="label">Customer:</span>
              <span class="val font-bold">${customerName}</span>
            </div>
            <div class="row">
              <span class="label">Outlet / Route:</span>
              <span class="val">${outletName}</span>
            </div>
            <div class="row">
              <span class="label">Cashier:</span>
              <span class="val">${cashierName}</span>
            </div>
            <div class="row">
              <span class="label">Payment Mode:</span>
              <span class="val" style="color: #047857; font-weight: 700;">${paymentMode}</span>
            </div>

            <table style="margin-top: 6px;">
              <thead>
                <tr>
                  <th>Item</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Rate</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div class="divider-thick"></div>

            <div class="row">
              <span class="label">Items Subtotal:</span>
              <span class="val val-bold">Rs. ${subtotal.toFixed(2)}</span>
            </div>

            ${discount > 0 ? `
              <div class="row" style="color: #047857; font-weight: 700;">
                <span>Special Discount:</span>
                <span style="font-family: monospace;">-Rs. ${discount.toFixed(2)}</span>
              </div>
            ` : ''}

            <div class="total-box">
              <span class="total-title">NET TOTAL:</span>
              <span class="total-val">Rs. ${totalAmount.toFixed(2)}</span>
            </div>

            <div class="receipt-tag">${receiptNumber}</div>

            <div class="footer-msg">
              <p>Keep milk and paneer refrigerated below 4°C at all times.</p>
              <p>Goods once sold are non-returnable.</p>
              <p style="font-weight: 700; color: #334155; margin-top: 3px;">Thank you for choosing Mother Dairy!</p>
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
      console.error('Print trigger failed:', e);
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Clean Modal Header (Without duplicate action buttons) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm tracking-tight">Receipt Generated</h3>
              <p className="text-[10px] text-slate-400 font-mono">{receiptNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
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
              <p className="text-[10px] text-slate-500 mt-0.5">
                C-3383, Opposite SBI ATM, Near MIS Chauraha, Rajajipuram, Lucknow - 226017
              </p>
              <p className="text-[9.5px] text-slate-400">
                Email: sudhanshuipsr@gmail.com • Ph: 1800-180-1018
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
                <span className="font-medium text-slate-700">{outletName}</span>
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
                    const lineTotal = Number(it.subtotal || it.quantity * it.sellingPrice || 0);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 pr-2">
                          <div className="font-bold text-slate-900 leading-snug">{name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {it.product?.qrCode || ''}
                          </div>
                        </td>
                        <td className="py-2 text-center text-slate-700 whitespace-nowrap font-bold">
                          {it.quantity} {unit}
                        </td>
                        <td className="py-2 text-right text-slate-600 whitespace-nowrap">
                          ₹{Number(it.sellingPrice || 0).toFixed(2)}
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

            <div className="pt-3 text-center border-t border-dashed border-slate-200">
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

        {/* Modal Bottom Actions: Print Slip, Download PDF & Close */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-[#0B4F9C] border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98"
              title="Print Receipt Slip"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-500/20 flex items-center gap-2 transition-all cursor-pointer hover:scale-102 active:scale-98"
              title="Download Receipt as PDF file"
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
