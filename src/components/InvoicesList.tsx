import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Search,
  FileSpreadsheet,
  FileDown,
  Eye,
  CheckCircle2,
  Clock,
  Filter,
  DollarSign,
  ReceiptText,
  User,
  Calendar,
  X,
  Trash2,
  AlertTriangle,
  RotateCcw,
  PackageCheck
} from 'lucide-react';
import { Invoice } from '../types';
import { generateInvoicePDF } from '../services/pdfGenerator';

export const InvoicesList: React.FC = () => {
  const { invoices, updateInvoicePaymentStatus, deleteInvoice, settings, showToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Pending' | 'Partial'>('All');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [restoreStockOnDelete, setRestoreStockOnDelete] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchSearch =
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.customerPhone.includes(searchQuery) ||
        (inv.customerGst && inv.customerGst.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = statusFilter === 'All' || inv.paymentStatus === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  const totalFilteredRevenue = filteredInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);

  const handleConfirmDelete = async () => {
    if (!invoiceToDelete) return;
    setIsDeleting(true);
    try {
      await deleteInvoice(invoiceToDelete.id, restoreStockOnDelete);
      if (selectedInvoice?.id === invoiceToDelete.id) {
        setSelectedInvoice(null);
      }
      setInvoiceToDelete(null);
    } catch (err: any) {
      showToast(`Error deleting invoice: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-7 h-7 text-blue-600" />
            <span>Invoice History & Ledger</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
            Complete transaction archive, payment statuses, and downloadable PDF invoices
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-5 py-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-xs">
            <span className="text-gray-500 dark:text-slate-400 block font-bold text-[10px] uppercase tracking-wider">Total Ledger Revenue:</span>
            <strong className="text-blue-700 dark:text-blue-300 text-base font-black">
              {settings.currencySymbol}{Math.round(totalFilteredRevenue).toLocaleString('en-IN')}
            </strong>
          </div>
        </div>
      </div>

      {/* Filter and Search Bento Bar */}
      <div className="p-5 rounded-[28px] border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search invoice number (e.g. TRE-2026-0891), customer name, phone, GSTIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div className="sm:col-span-4 flex items-center gap-1.5">
            {(['All', 'Paid', 'Pending', 'Partial'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`flex-1 py-2.5 rounded-2xl text-xs font-bold text-center border transition-colors ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Invoices Table Bento Card */}
      <div className="rounded-[28px] border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-gray-50 dark:bg-slate-800/80 text-gray-700 dark:text-slate-200 uppercase tracking-wider text-[10px] font-extrabold border-b border-gray-200/80 dark:border-slate-800">
              <tr>
                <th className="px-5 py-4">Invoice # & Date</th>
                <th className="px-5 py-4">Customer Details</th>
                <th className="px-5 py-4">Items Billed</th>
                <th className="px-5 py-4">Payment Mode</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-right">Total Amount</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-medium">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    No invoices match your search filter.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors">
                    
                    {/* Invoice # & Date */}
                    <td className="px-5 py-4">
                      <p className="font-mono font-bold text-slate-900 dark:text-white">
                        {inv.invoiceNumber}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {new Date(inv.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {inv.customerName}
                      </p>
                      <p className="text-[11px] text-gray-400 font-mono">
                        {inv.customerPhone}
                      </p>
                    </td>

                    {/* Items count */}
                    <td className="px-5 py-4">
                      <span className="text-slate-800 dark:text-slate-200 font-bold">
                        {inv.items.length} item(s)
                      </span>
                      <p className="text-[11px] text-gray-400 truncate max-w-[150px]">
                        {inv.items.map(i => i.name).join(', ')}
                      </p>
                    </td>

                    {/* Payment Mode */}
                    <td className="px-5 py-4 text-gray-700 dark:text-slate-300 text-[11px] font-medium">
                      {inv.paymentMode}
                    </td>

                    {/* Status badge */}
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => {
                          const next = inv.paymentStatus === 'Paid' ? 'Pending' : 'Paid';
                          updateInvoicePaymentStatus(inv.id, next);
                        }}
                        title="Click to toggle status"
                        className={`px-3 py-1 rounded-full text-xs font-black transition-transform active:scale-95 ${
                          inv.paymentStatus === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {inv.paymentStatus}
                      </button>
                    </td>

                    {/* Total Amount */}
                    <td className="px-5 py-4 text-right font-black text-slate-900 dark:text-white">
                      {settings.currencySymbol}{inv.totalAmount.toFixed(2)}
                    </td>

                    {/* Action buttons */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="p-2 rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                          title="View Invoice Breakdown"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => generateInvoicePDF(inv, settings)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 border border-blue-100 dark:border-blue-900 transition-colors"
                          title="Download PDF"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                        <button
                          onClick={() => {
                            setInvoiceToDelete(inv);
                            setRestoreStockOnDelete(true);
                          }}
                          className="p-2 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                          title="Delete / Void Invoice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Detailed Invoice Breakdown Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[28px] border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-7 relative">
            
            <button
              onClick={() => setSelectedInvoice(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Invoice Header */}
            <div className="border-b border-gray-100 dark:border-slate-800 pb-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600">
                    TAX INVOICE DETAILS
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {selectedInvoice.invoiceNumber}
                  </h3>
                  <p className="text-xs text-gray-400">
                    Issued on {new Date(selectedInvoice.createdAt).toLocaleString('en-IN')} by {selectedInvoice.createdByName}
                  </p>
                </div>
                <span className={`px-3.5 py-1.5 rounded-full text-xs font-black ${
                  selectedInvoice.paymentStatus === 'Paid'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {selectedInvoice.paymentStatus}
                </span>
              </div>

              {/* Store Identity Strip */}
              <div className="mt-3 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-y-1 gap-x-3">
                  <span className="font-extrabold text-slate-900 dark:text-white">{settings.businessName}</span>
                  <span><strong>GST No:</strong> {settings.gstin}</span>
                  <span><strong>Phn No:</strong> {settings.phone}</span>
                  <span><strong>Mail ID:</strong> {settings.email}</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  <span><strong>Address:</strong> {settings.address}, {settings.city}, {settings.state} - PIN: {settings.pincode}</span>
                </div>
              </div>
            </div>

            {/* Customer Details Box */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 text-xs grid grid-cols-2 gap-3 mb-4">
              <div>
                <span className="text-gray-400 font-semibold">Billed To:</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedInvoice.customerName}</p>
                <p className="text-gray-500">{selectedInvoice.customerPhone}</p>
                {selectedInvoice.customerAddress && (
                  <p className="text-[11px] text-gray-400 mt-0.5">{selectedInvoice.customerAddress}</p>
                )}
              </div>
              <div>
                <span className="text-gray-400 font-semibold">Payment Mode & GSTIN:</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedInvoice.paymentMode}</p>
                {selectedInvoice.customerGst && (
                  <p className="text-gray-500 font-mono">Customer GST: {selectedInvoice.customerGst}</p>
                )}
                {selectedInvoice.customerEmail && (
                  <p className="text-[11px] text-gray-400 mt-0.5">{selectedInvoice.customerEmail}</p>
                )}
              </div>
            </div>

            {/* Itemized Table matching uploaded bill format: HSN | UNITS | RATE | AMOUNT */}
            <div className="space-y-2 mb-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-300">
                Itemized Products
              </h4>
              <div className="border rounded-2xl overflow-hidden border-gray-200 dark:border-slate-800">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 dark:bg-slate-800/80 text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[10px] font-extrabold border-b border-gray-200 dark:border-slate-800">
                      <tr>
                        <th className="px-3.5 py-2.5 text-center w-10">#</th>
                        <th className="px-3.5 py-2.5">Description</th>
                        <th className="px-3.5 py-2.5 text-center font-bold">HSN</th>
                        <th className="px-3.5 py-2.5 text-center">UNITS</th>
                        <th className="px-3.5 py-2.5 text-right">RATE</th>
                        <th className="px-3.5 py-2.5 text-right">AMOUNT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {selectedInvoice.items.map((item, idx) => {
                        const effectiveRate = item.unitPrice * (1 - (item.discountPercent || 0) / 100);
                        const itemAmount = item.quantity * effectiveRate;
                        return (
                          <tr key={idx} className="bg-white dark:bg-slate-900 hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="px-3.5 py-2.5 text-center text-gray-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="px-3.5 py-2.5">
                              <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                              <p className="text-[10px] text-gray-400 font-mono">
                                {item.brand}{item.packSize ? ` &bull; Pack: ${item.packSize}` : ''}
                              </p>
                            </td>
                            <td className="px-3.5 py-2.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                              {item.hsn || item.sku || '—'}
                            </td>
                            <td className="px-3.5 py-2.5 text-center font-bold text-slate-900 dark:text-white font-mono">{item.quantity}</td>
                            <td className="px-3.5 py-2.5 text-right font-mono text-slate-700 dark:text-slate-300">
                              {effectiveRate.toFixed(2)}
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-bold text-slate-900 dark:text-white font-mono">
                              {itemAmount.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50/80 dark:bg-slate-800/60 font-bold border-t border-gray-200 dark:border-slate-700">
                      <tr>
                        <td colSpan={5} className="px-3.5 py-2 text-right text-gray-600 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                          Table Total:
                        </td>
                        <td className="px-3.5 py-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {(
                            selectedInvoice.items.reduce(
                              (sum, item) => sum + item.quantity * item.unitPrice * (1 - (item.discountPercent || 0) / 100),
                              0
                            )
                          ).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Totals Summary matching the official GST standard */}
            {(() => {
              const rawSubtotal = selectedInvoice.subtotal || selectedInvoice.items.reduce(
                (sum, item) => sum + item.quantity * item.unitPrice,
                0
              );
              const discAmt = selectedInvoice.discountAmount || 0;
              const grandAmt = Math.max(0, rawSubtotal - discAmt);
              const halfTax = (selectedInvoice.taxPercent || 18) / 2;
              const cgstAmt = +(grandAmt * (halfTax / 100)).toFixed(2);
              const sgstAmt = +(grandAmt * (halfTax / 100)).toFixed(2);
              const unrounded = grandAmt + cgstAmt + sgstAmt;
              const roundedTotal = Math.round(unrounded);
              const roundOff = +(roundedTotal - unrounded).toFixed(2);

              return (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm space-y-2 text-xs mb-4">
                  {discAmt > 0 ? (
                    <>
                      <div className="flex justify-between text-slate-700 dark:text-slate-300">
                        <span>Gross Subtotal</span>
                        <span className="font-mono font-bold">{rawSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/50 dark:bg-emerald-950/30 px-2 py-1 rounded-lg">
                        <span>Discount Applied</span>
                        <span className="font-mono">-{settings.currencySymbol}{discAmt.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-700 dark:text-slate-300 font-semibold">
                        <span>Taxable Amount</span>
                        <span className="font-mono font-bold">{grandAmt.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-700 dark:text-slate-300 font-semibold">
                      <span>Grand Amount</span>
                      <span className="font-mono font-bold">{grandAmt.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-700 dark:text-slate-300">
                    <span>CGST {halfTax.toFixed(2)}%</span>
                    <span className="font-mono font-bold">{cgstAmt.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-700 dark:text-slate-300">
                    <span>SGST {halfTax.toFixed(2)}%</span>
                    <span className="font-mono font-bold">{sgstAmt.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-700 dark:text-slate-300">
                    <span>ROUND OFF</span>
                    <span className="font-mono font-bold">
                      {roundOff < 0 ? `(- ${Math.abs(roundOff).toFixed(2)})` : roundOff > 0 ? `(+ ${roundOff.toFixed(2)})` : '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm sm:text-base font-black text-slate-900 dark:text-white pt-2.5 border-t border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                    <span className="tracking-wider uppercase">GRAND TOTAL</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400">
                      {roundedTotal}/-
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Bank & Payment Reference */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-gray-200/80 dark:border-slate-800 text-xs mb-6 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Payment & Bank Details</span>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                <p><strong>Bank:</strong> {settings.bankName}</p>
                <p><strong>Account Name:</strong> {settings.accountName || 'T R ENTERPRISE'}</p>
                <p className="font-mono"><strong>A/C No:</strong> {settings.accountNumber}</p>
                <p className="font-mono"><strong>IFSC:</strong> {settings.ifscCode}</p>
                <p className="col-span-2 text-blue-600 dark:text-blue-400 font-mono"><strong>UPI ID:</strong> {settings.upiId}</p>
              </div>
            </div>

            {/* Action Bar in Modal */}
            <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setInvoiceToDelete(selectedInvoice);
                  setRestoreStockOnDelete(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/70 border border-red-200 dark:border-red-900/60 transition-colors"
                title="Delete this invoice"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Invoice</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-gray-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-gray-200"
                >
                  Close
                </button>
                <button
                  onClick={() => generateInvoicePDF(selectedInvoice, settings)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Download PDF Invoice</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Delete Invoice Confirmation Modal */}
      {invoiceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-[28px] border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 shadow-2xl p-6 sm:p-7 relative space-y-5">
            
            <button
              onClick={() => setInvoiceToDelete(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Warning Header */}
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-200 dark:border-red-900/60">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Delete Invoice #{invoiceToDelete.invoiceNumber}?
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Customer: <strong className="text-slate-800 dark:text-slate-200">{invoiceToDelete.customerName}</strong> &bull; Amount: <strong className="text-slate-800 dark:text-slate-200">{settings.currencySymbol}{invoiceToDelete.totalAmount.toFixed(2)}</strong>
                </p>
              </div>
            </div>

            {/* Billed Items Info Box */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 text-xs space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">
                Billed Items in this Invoice ({invoiceToDelete.items.length}):
              </span>
              <ul className="divide-y divide-gray-100 dark:divide-slate-800 max-h-36 overflow-y-auto pr-1">
                {invoiceToDelete.items.map((it, idx) => (
                  <li key={idx} className="py-1.5 flex items-center justify-between text-[11px]">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                      {it.name} ({it.packSize})
                    </span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                      {it.quantity} Unit(s)
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Restock Checkbox */}
            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 cursor-pointer">
              <input
                type="checkbox"
                checked={restoreStockOnDelete}
                onChange={(e) => setRestoreStockOnDelete(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 dark:text-white block">
                  Restock / Return items to inventory
                </span>
                <p className="text-gray-500 dark:text-slate-400 text-[11px] mt-0.5">
                  Automatically replenishes product stock counts and logs the restoration under inventory audit records.
                </p>
              </div>
            </label>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setInvoiceToDelete(null)}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-gray-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 active:scale-95 transition-all disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Invoice'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
