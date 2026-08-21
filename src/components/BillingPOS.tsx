import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Search,
  Plus,
  Trash2,
  ReceiptText,
  FileDown,
  Printer,
  Sparkles,
  ShoppingBag,
  User,
  Phone,
  MapPin,
  FileCheck,
  CreditCard,
  Banknote,
  Smartphone,
  Landmark,
  BookOpen,
  CheckCircle2,
  X,
  AlertCircle,
  Percent,
  IndianRupee,
  Tag
} from 'lucide-react';
import { Product, InvoiceItem, PaymentMode, Invoice } from '../types';
import { generateInvoicePDF } from '../services/pdfGenerator';
import confetti from 'canvas-confetti';

export const BillingPOS: React.FC = () => {
  const { products, createInvoice, settings, showToast } = useApp();

  // Invoice Items in current POS cart
  const [cartItems, setCartItems] = useState<InvoiceItem[]>([]);

  // Customer Details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGst, setCustomerGst] = useState('');

  // Payment & Overall Discount Options
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [overallDiscountType, setOverallDiscountType] = useState<'percent' | 'amount'>('percent');
  const [overallDiscountValue, setOverallDiscountValue] = useState<number>(0);
  const [invoiceNotes, setInvoiceNotes] = useState('');

  // Product Selection Search
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Success Modal State with completed invoice
  const [completedInvoice, setCompletedInvoice] = useState<Invoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter available products for adding to cart
  const availableProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch =
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.hsn && p.hsn.toLowerCase().includes(productSearch.toLowerCase())) ||
        (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase())) ||
        (p.shadeCode && p.shadeCode.toLowerCase().includes(productSearch.toLowerCase()));
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, productSearch, selectedCategory]);

  // Add product to POS cart
  const handleAddToCart = (product: Product) => {
    if (product.quantity <= 0) {
      showToast(`Cannot add "${product.name}" - Stock is 0`, 'error');
      return;
    }

    const existingIndex = cartItems.findIndex(item => item.productId === product.id);

    if (existingIndex >= 0) {
      const currentQty = cartItems[existingIndex].quantity;
      if (currentQty + 1 > product.quantity) {
        showToast(`Only ${product.quantity} units available in stock!`, 'warning');
        return;
      }
      const updated = [...cartItems];
      const newQty = currentQty + 1;
      const disc = updated[existingIndex].discountPercent;
      const unitTotal = product.unitPrice * newQty * (1 - disc / 100);
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: newQty,
        total: unitTotal
      };
      setCartItems(updated);
    } else {
      const newItem: InvoiceItem = {
        productId: product.id,
        hsn: product.hsn || product.sku,
        sku: product.hsn || product.sku,
        name: product.name,
        category: product.category,
        brand: product.brand,
        packSize: product.packSize,
        unitPrice: product.unitPrice,
        quantity: 1,
        discountPercent: 0,
        taxPercent: settings.taxRate || settings.defaultTaxPercent || 18,
        total: product.unitPrice
      };
      setCartItems([...cartItems, newItem]);
    }
  };

  // Update Item Quantity
  const handleUpdateItemQty = (productId: string, newQty: number) => {
    const targetProduct = products.find(p => p.id === productId);
    if (!targetProduct) return;

    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }

    if (newQty > targetProduct.quantity) {
      showToast(`Stock limit reached! Only ${targetProduct.quantity} units available.`, 'warning');
      return;
    }

    setCartItems(
      cartItems.map(item => {
        if (item.productId === productId) {
          return {
            ...item,
            quantity: newQty,
            total: item.unitPrice * newQty
          };
        }
        return item;
      })
    );
  };

  // Remove Item from Cart
  const handleRemoveItem = (productId: string) => {
    setCartItems(cartItems.filter(item => item.productId !== productId));
  };

  // Calculations
  const grossSubtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  }, [cartItems]);

  const itemsTotalDiscount = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      const regularCost = item.unitPrice * item.quantity;
      return acc + (regularCost - item.total);
    }, 0);
  }, [cartItems]);

  const discountedItemsTotal = Math.max(0, grossSubtotal - itemsTotalDiscount);

  // Overall Discount Calculation (supports both Amount and %)
  const overallDiscountAmount = useMemo(() => {
    if (overallDiscountValue <= 0) return 0;
    if (overallDiscountType === 'percent') {
      const clampedPct = Math.min(100, overallDiscountValue);
      return (discountedItemsTotal * clampedPct) / 100;
    } else {
      // Amount discount
      return Math.min(discountedItemsTotal, overallDiscountValue);
    }
  }, [discountedItemsTotal, overallDiscountType, overallDiscountValue]);

  const totalDiscountAmount = itemsTotalDiscount + overallDiscountAmount;
  const taxableAmount = Math.max(0, discountedItemsTotal - overallDiscountAmount);
  
  const taxPercent = settings.taxRate || settings.defaultTaxPercent || 18;
  const taxAmount = (taxableAmount * taxPercent) / 100;
  const grandTotal = Math.round(taxableAmount + taxAmount);

  // Auto Invoice Number
  const nextInvoiceNumber = `TRE-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

  // Submit Invoice Creation
  const handleCompleteInvoice = async () => {
    if (!customerName.trim()) {
      showToast('Please enter customer name', 'warning');
      return;
    }
    if (!customerPhone.trim()) {
      showToast('Please enter customer phone number', 'warning');
      return;
    }
    if (cartItems.length === 0) {
      showToast('Please add at least 1 product to create an invoice', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createInvoice({
        invoiceNumber: nextInvoiceNumber,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        customerGst: customerGst.trim() || undefined,
        items: cartItems,
        subtotal: grossSubtotal,
        discountAmount: totalDiscountAmount,
        taxPercent,
        taxAmount,
        totalAmount: grandTotal,
        paymentMode,
        paymentStatus: paymentMode === 'Credit (Khata)' ? 'Pending' : 'Paid',
        notes: invoiceNotes.trim() || undefined
      });

      // Confetti celebratory burst!
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch {}

      setCompletedInvoice(created);
      
      // Reset Form
      setCartItems([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setCustomerAddress('');
      setCustomerGst('');
      setOverallDiscountValue(0);
      setInvoiceNotes('');
    } catch (err: any) {
      showToast(err.message || 'Failed to generate invoice', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentIcons = {
    'Cash': <Banknote className="w-4 h-4 text-emerald-600" />,
    'UPI / GPay / PhonePe': <Smartphone className="w-4 h-4 text-blue-600" />,
    'Credit Card / Debit Card': <CreditCard className="w-4 h-4 text-purple-600" />,
    'Bank Transfer (NEFT/RTGS)': <Landmark className="w-4 h-4 text-slate-600" />,
    'Credit (Khata)': <BookOpen className="w-4 h-4 text-amber-600" />
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <ReceiptText className="w-7 h-7 text-blue-600" />
            <span>POS Counter & Invoice Generator</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Instant billing, automatic GST calculation & stock deduction for {settings.businessName}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-3.5 py-2 rounded-2xl bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
            Next Invoice: {nextInvoiceNumber}
          </span>
        </div>
      </div>

      {/* Main 2-Column Bento POS Layout */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Product Selector & Stock Finder (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          <div className="p-6 rounded-[28px] border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                1. Select Products From Inventory
              </h3>
              <span className="text-[11px] font-bold text-gray-400">
                {availableProducts.length} Available
              </span>
            </div>

            {/* Product Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="pos-product-search-input"
                type="text"
                placeholder="Search paint, shade, HSN code..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Products List */}
            <div className="max-h-96 overflow-y-auto space-y-2 pr-1 divide-y divide-gray-100 dark:divide-slate-800">
              {availableProducts.map((p) => {
                const inCart = cartItems.find(item => item.productId === p.id);
                const isOutOfStock = p.quantity <= 0;

                return (
                  <div
                    key={p.id}
                    className="pt-2.5 first:pt-0 flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {p.name}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {p.packSize}{(p.hsn || p.sku) ? <> &bull; HSN: <span className="font-mono">{p.hsn || p.sku}</span></> : null} &bull; Stock: <strong className={p.quantity <= p.minStockAlert ? 'text-red-600' : 'text-emerald-600'}>{p.quantity}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        {settings.currencySymbol}{p.unitPrice.toFixed(0)}
                      </span>
                      <button
                        id={`pos-add-btn-${p.id}`}
                        disabled={isOutOfStock}
                        onClick={() => handleAddToCart(p)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isOutOfStock
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-slate-800'
                            : inCart
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-sm'
                        }`}
                      >
                        {isOutOfStock ? 'Sold Out' : inCart ? `Added (${inCart.quantity})` : '+ Add'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customer Details Bento Card */}
          <div className="p-6 rounded-[28px] border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3.5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              2. Customer & Tax Information
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">
                  Customer Name *
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="customer-name-input"
                    type="text"
                    placeholder="e.g. Ramesh Chandra (Contractor)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-2xl text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 block mb-1">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="customer-phone-input"
                      type="text"
                      placeholder="+91 98300..."
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-2xl text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 block mb-1">
                    GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="19AAAAA0000A1Z5"
                    value={customerGst}
                    onChange={(e) => setCustomerGst(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-2xl text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">
                  Delivery / Billing Address (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Site / Apartment Address"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Invoice Cart, Breakdown & Action Bar (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Active Items Bento Card */}
          <div className="rounded-[28px] border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-6 space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-blue-600" />
                <span>3. Billed Invoice Items ({cartItems.length})</span>
              </h3>
              {cartItems.length > 0 && (
                <button
                  onClick={() => setCartItems([])}
                  className="text-[11px] font-bold text-red-600 hover:underline"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {cartItems.length === 0 ? (
              <div className="py-12 text-center text-gray-400 space-y-2">
                <ShoppingBag className="w-10 h-10 mx-auto stroke-1 opacity-40 text-gray-400" />
                <p className="text-xs font-bold text-gray-500">
                  No items selected yet. Click "+ Add" on the left catalog.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.productId} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {item.packSize} &bull; {settings.currencySymbol}{item.unitPrice.toFixed(2)} each
                      </p>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleUpdateItemQty(item.productId, item.quantity - 1)}
                        className="w-7 h-7 rounded-xl bg-gray-100 dark:bg-slate-800 font-bold text-xs flex items-center justify-center hover:bg-gray-200 transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => handleUpdateItemQty(item.productId, parseInt(e.target.value) || 1)}
                        className="w-11 text-center py-1 text-xs font-black bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl"
                      />
                      <button
                        onClick={() => handleUpdateItemQty(item.productId, item.quantity + 1)}
                        className="w-7 h-7 rounded-xl bg-gray-100 dark:bg-slate-800 font-bold text-xs flex items-center justify-center hover:bg-gray-200 transition-colors"
                      >
                        +
                      </button>
                    </div>

                    {/* Item Total */}
                    <div className="text-right w-24 shrink-0">
                      <p className="text-xs font-extrabold text-slate-900 dark:text-white font-mono">
                        {settings.currencySymbol}{(item.unitPrice * item.quantity).toFixed(2)}
                      </p>
                    </div>

                    {/* Delete Item */}
                    <button
                      onClick={() => handleRemoveItem(item.productId)}
                      className="p-1.5 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

          </div>

          {/* Dedicated Bill Discount & Payment Section Bento Card */}
          <div className="p-6 rounded-[28px] border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            
            {/* Dedicated Overall Bill Discount Section */}
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-600" />
                  <span>Extra Bill Discount (Optional)</span>
                </label>
                
                {/* Discount Unit Mode Toggle: % vs ₹ */}
                <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl p-0.5 border border-amber-300/80 dark:border-amber-800/80 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setOverallDiscountType('percent')}
                    className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                      overallDiscountType === 'percent'
                        ? 'bg-amber-500 text-white shadow-xs font-black'
                        : 'text-gray-600 dark:text-slate-300 hover:text-amber-600'
                    }`}
                  >
                    <Percent className="w-3 h-3" />
                    <span>Percent (%)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverallDiscountType('amount')}
                    className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                      overallDiscountType === 'amount'
                        ? 'bg-amber-500 text-white shadow-xs font-black'
                        : 'text-gray-600 dark:text-slate-300 hover:text-amber-600'
                    }`}
                  >
                    <IndianRupee className="w-3 h-3" />
                    <span>Amount (₹)</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min={0}
                    max={overallDiscountType === 'percent' ? 100 : grossSubtotal}
                    step={overallDiscountType === 'percent' ? 0.5 : 1}
                    placeholder={overallDiscountType === 'percent' ? 'Enter % (e.g. 5, 10)' : 'Enter discount in ₹ (e.g. 50, 200)'}
                    value={overallDiscountValue > 0 ? overallDiscountValue : ''}
                    onChange={(e) => setOverallDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800/80 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-amber-600 dark:text-amber-400">
                    {overallDiscountType === 'percent' ? '%' : settings.currencySymbol}
                  </span>
                </div>

                {overallDiscountAmount > 0 && (
                  <div className="text-right shrink-0 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-800">
                    <p className="text-[10px] text-gray-500 dark:text-slate-400 uppercase font-extrabold">You Save</p>
                    <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      -{settings.currencySymbol}{overallDiscountAmount.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Mode Selector */}
            <div>
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200 block mb-2.5">
                4. Select Payment Mode
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(['Cash', 'UPI / GPay / PhonePe', 'Credit Card / Debit Card', 'Credit (Khata)', 'Bank Transfer (NEFT/RTGS)'] as PaymentMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`flex items-center gap-2 p-3 rounded-2xl border text-xs font-bold text-left transition-all ${
                      paymentMode === mode
                        ? 'border-blue-600 bg-blue-50/90 text-blue-950 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-500 shadow-sm'
                        : 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {paymentIcons[mode]}
                    <span className="truncate">{mode}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Financial Breakdown Table matching the uploaded image format */}
            {(() => {
              const halfTaxRate = taxPercent / 2;
              const cgstAmt = +(taxableAmount * (halfTaxRate / 100)).toFixed(2);
              const sgstAmt = +(taxableAmount * (halfTaxRate / 100)).toFixed(2);
              const unroundedTotal = taxableAmount + cgstAmt + sgstAmt;
              const roundedGrandTotal = Math.round(unroundedTotal);
              const roundOffVal = +(roundedGrandTotal - unroundedTotal).toFixed(2);

              return (
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-700 dark:text-slate-300 font-semibold">
                    <span>Grand Amount (Taxable):</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {taxableAmount.toFixed(2)}
                    </span>
                  </div>

                  {totalDiscountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                      <span>Discount Savings:</span>
                      <span>-{totalDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>CGST {halfTaxRate.toFixed(2)}%:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {cgstAmt.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>SGST {halfTaxRate.toFixed(2)}%:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {sgstAmt.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>ROUND OFF:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {roundOffVal < 0
                        ? `(- ${Math.abs(roundOffVal).toFixed(2)})`
                        : roundOffVal > 0
                          ? `(+ ${roundOffVal.toFixed(2)})`
                          : '0.00'}
                    </span>
                  </div>

                  <div className="pt-2.5 border-t border-gray-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-900 p-2.5 rounded-xl">
                    <div>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wide">
                        GRAND TOTAL:
                      </span>
                      <p className="text-[10px] text-gray-400 font-medium">
                        (Inclusive of CGST & SGST)
                      </p>
                    </div>
                    <span className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
                      {roundedGrandTotal}/-
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Notes / Remarks */}
            <div>
              <input
                type="text"
                placeholder="Invoice notes / site details (Optional)"
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Primary Action: Complete & Generate Invoice */}
            <button
              id="pos-finalize-invoice-btn"
              disabled={isSubmitting || cartItems.length === 0}
              onClick={handleCompleteInvoice}
              className={`w-full py-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 text-white shadow-lg transition-all ${
                isSubmitting || cartItems.length === 0
                  ? 'bg-gray-300 dark:bg-slate-800 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-blue-500/30'
              }`}
            >
              <FileCheck className="w-5 h-5" />
              <span>{isSubmitting ? 'Generating Invoice...' : `Generate Invoice & Bill (${settings.currencySymbol}${grandTotal.toFixed(2)})`}</span>
            </button>

          </div>

        </div>

      </div>

      {/* Invoice Created Celebration Modal with Download PDF Button */}
      {completedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-[28px] border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-7 text-center space-y-4 animate-in zoom-in-95">
            
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Invoice Generated Successfully!
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {completedInvoice.invoiceNumber}
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Billed to <strong>{completedInvoice.customerName}</strong> for <strong>{settings.currencySymbol}{completedInvoice.totalAmount.toFixed(2)}</strong> ({completedInvoice.paymentMode})
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 text-xs text-left space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Items:</span>
                <span className="font-bold text-slate-900 dark:text-white">{completedInvoice.items.length} Product(s)</span>
              </div>
              {completedInvoice.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Discount Saved:</span>
                  <span>-{settings.currencySymbol}{completedInvoice.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Inventory Status:</span>
                <span className="font-bold text-emerald-600">Stock Deducted Automatically</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Payment Status:</span>
                <span className="font-bold text-slate-900 dark:text-white">{completedInvoice.paymentStatus}</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                id="modal-download-pdf-btn"
                onClick={() => generateInvoicePDF(completedInvoice, settings)}
                className="w-full py-3.5 rounded-2xl font-extrabold text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-95 transition-all"
              >
                <FileDown className="w-4 h-4" />
                <span>Download Official PDF Tax Invoice</span>
              </button>

              <button
                onClick={() => setCompletedInvoice(null)}
                className="w-full py-3 rounded-2xl font-bold text-xs bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
              >
                Start Next Sale
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
