import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, RefreshCw, PlusCircle, MinusCircle, AlertTriangle, ArrowRight } from 'lucide-react';

interface QuickStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string | null;
}

export const QuickStockModal: React.FC<QuickStockModalProps> = ({
  isOpen,
  onClose,
  productId
}) => {
  const { products, adjustStock } = useApp();

  const product = products.find(p => p.id === productId);

  const [operationType, setOperationType] = useState<'in' | 'out' | 'damage' | 'adjustment'>('in');
  const [deltaQty, setDeltaQty] = useState<number>(5);
  const [reason, setReason] = useState('New Shipment Received from Berger Depot');

  if (!isOpen || !product) return null;

  const signedDelta = (operationType === 'out' || operationType === 'damage') ? -Math.abs(deltaQty) : Math.abs(deltaQty);
  const calculatedNewQty = Math.max(0, product.quantity + signedDelta);

  const predefinedReasons = {
    'in': [
      'New Shipment Received from Berger Depot',
      'Stock Purchase from Hardware Wholesaler',
      'Customer Purchase Return',
      'Found during physical warehouse count'
    ],
    'out': [
      'Issued for sample demonstration',
      'Transferred to branch store',
      'Manual counter adjustment'
    ],
    'damage': [
      'Paint tin dented / leaked in transport',
      'Seal broken / expired batch',
      'Damaged hardware tool'
    ],
    'adjustment': [
      'Physical audit correction',
      'Discrepancy reconciled'
    ]
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deltaQty <= 0) return;

    await adjustStock(product.id, signedDelta, reason.trim(), operationType);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 relative">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold text-xs">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Quick Stock Adjustment
            </h3>
            <p className="text-xs text-slate-500 truncate max-w-[240px]">
              {product.name} ({product.packSize})
            </p>
          </div>
        </div>

        <form onSubmit={handleApply} className="space-y-4 text-xs">
          
          {/* Operation Type Switcher */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => {
                setOperationType('in');
                setReason(predefinedReasons['in'][0]);
              }}
              className={`py-1.5 rounded-lg font-bold transition-all ${
                operationType === 'in'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              + Stock In
            </button>
            <button
              type="button"
              onClick={() => {
                setOperationType('out');
                setReason(predefinedReasons['out'][0]);
              }}
              className={`py-1.5 rounded-lg font-bold transition-all ${
                operationType === 'out'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              - Stock Out
            </button>
            <button
              type="button"
              onClick={() => {
                setOperationType('damage');
                setReason(predefinedReasons['damage'][0]);
              }}
              className={`py-1.5 rounded-lg font-bold transition-all ${
                operationType === 'damage'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Damaged
            </button>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
              Quantity to Change (Units) *
            </label>
            <input
              type="number"
              min={1}
              required
              value={deltaQty}
              onChange={(e) => setDeltaQty(Math.max(1, Number(e.target.value)))}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-sm"
            />
          </div>

          {/* Reason Selection / Custom Reason */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
              Reason / Memo *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium mb-1.5"
            >
              {predefinedReasons[operationType].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
              <option value="custom">Other (Specify below)...</option>
            </select>

            {reason === 'custom' && (
              <input
                type="text"
                placeholder="Enter specific memo/voucher details"
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            )}
          </div>

          {/* Before and After Preview */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <span className="text-slate-400 block text-[10px]">Current Stock:</span>
              <strong className="text-slate-900 dark:text-white text-sm">{product.quantity} Units</strong>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <div className="text-right">
              <span className="text-slate-400 block text-[10px]">Calculated New Stock:</span>
              <strong className="text-orange-600 dark:text-orange-400 text-sm font-black">
                {calculatedNewQty} Units
              </strong>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-md transition-all"
            >
              Confirm Adjustment
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
