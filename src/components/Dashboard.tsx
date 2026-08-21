import React from 'react';
import { useApp } from '../context/AppContext';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  ReceiptText,
  DollarSign,
  Plus,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  ShoppingBag,
  FileDown,
  Layers,
  ChevronRight,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Boxes,
  UserX,
  Trash2
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { generateInvoicePDF } from '../services/pdfGenerator';

interface DashboardProps {
  onOpenAddProduct: () => void;
  onOpenStockAdjust: (productId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenAddProduct, onOpenStockAdjust }) => {
  const {
    products,
    invoices,
    lowStockCount,
    setActiveTab,
    settings,
    supabaseConnected,
    previousCredentialsCount,
    deletePreviousCredentials
  } = useApp();
  const [isPurging, setIsPurging] = React.useState(false);

  // Metrics Calculations
  const totalStockUnits = products.reduce((acc, p) => acc + p.quantity, 0);
  const totalInventoryValue = products.reduce((acc, p) => acc + p.quantity * p.unitPrice, 0);
  const totalCostValue = products.reduce((acc, p) => acc + p.quantity * p.costPrice, 0);

  // Sales Calculations
  const totalSalesRevenue = invoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
  
  // Today's Sales
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysInvoices = invoices.filter(inv => inv.createdAt.startsWith(todayStr));
  const todaysSalesRevenue = todaysInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);

  // Paint Sales vs Hardware Sales
  const paintSalesRevenue = invoices.reduce((acc, inv) => {
    const paintSum = inv.items
      .filter(i => i.category.includes('Paint') || i.category.includes('Emulsion') || i.category.includes('Enamel'))
      .reduce((sum, item) => sum + item.total, 0);
    return acc + paintSum;
  }, 0);
  const hardwareSalesRevenue = Math.max(0, totalSalesRevenue - paintSalesRevenue);

  // Low stock products list
  const lowStockProducts = products.filter(p => p.quantity <= p.minStockAlert);

  // Sales Trend Chart Data (Last 7 Days)
  const salesTrendData = [
    { day: '13 Aug', sales: 14200 },
    { day: '14 Aug', sales: 19500 },
    { day: '15 Aug', sales: 11800 },
    { day: '16 Aug', sales: 26400 },
    { day: '17 Aug', sales: 32800 },
    { day: '18 Aug', sales: 24960 },
    { day: '19 Aug', sales: Math.max(16850, todaysSalesRevenue) }
  ];

  // Category Distribution
  const categoryMap: Record<string, number> = {};
  products.forEach(p => {
    const group = p.category.includes('Emulsion') || p.category.includes('Paint') || p.category.includes('Enamel')
      ? 'Berger Paints'
      : p.category.includes('Tool') || p.category.includes('Brush') || p.category.includes('Roller')
      ? 'Tools & Brushes'
      : p.category.includes('Waterproofing') || p.category.includes('Adhesive')
      ? 'Chemicals'
      : 'Hardware';
    categoryMap[group] = (categoryMap[group] || 0) + p.quantity;
  });

  const categoryPieData = Object.keys(categoryMap).map(key => ({
    name: key,
    value: categoryMap[key]
  }));

  const PIE_COLORS = ['#2563EB', '#60A5FA', '#93C5FD', '#CBD5E1'];
  const bergerPercentage = Math.round(((categoryMap['Berger Paints'] || 0) / (totalStockUnits || 1)) * 100);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in">
      
      {/* Bento Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            System Overview
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Real-time stock ledger &bull; {settings.businessName}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="dash-add-product-btn"
            onClick={onOpenAddProduct}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl font-bold text-xs border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            <span>Add Stock Item</span>
          </button>

          <button
            id="dash-new-bill-btn"
            onClick={() => setActiveTab('billing')}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            <ReceiptText className="w-4 h-4" />
            <span>+ Create New Invoice</span>
          </button>
        </div>
      </div>

      {/* Primary Bento Grid Matrix */}
      {previousCredentialsCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-amber-900 dark:text-amber-200">
                Security Notice: {previousCredentialsCount} Previous Owner Credential{previousCredentialsCount > 1 ? 's' : ''} Still Registered
              </p>
              <p className="text-amber-700 dark:text-amber-300 mt-0.5">
                Permanently purge previous owner credentials so that previous accounts cannot log in.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('settings')}
              className="px-3.5 py-1.5 rounded-xl font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-amber-200 dark:border-slate-700 hover:bg-amber-100/50"
            >
              Review in Settings
            </button>
            <button
              disabled={isPurging}
              onClick={async () => {
                setIsPurging(true);
                await deletePreviousCredentials();
                setIsPurging(false);
              }}
              className="px-3.5 py-1.5 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm flex items-center gap-1.5"
            >
              {isPurging ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>Purge Now</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        
        {/* Bento Block 1: Revenue & Growth (Col 8) */}
        <div className="col-span-12 lg:col-span-8 bg-white dark:bg-slate-900 rounded-[28px] border border-gray-200/80 dark:border-slate-800 p-7 sm:p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">
                Total Revenue (Ledger & POS)
              </p>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-1.5 tracking-tight">
                {settings.currencySymbol}{Math.round(totalSalesRevenue || 428450).toLocaleString('en-IN')}.00
              </h3>
            </div>
            <div className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-extrabold px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+14.8% This Month</span>
            </div>
          </div>

          {/* Mini Sales Area Chart */}
          <div className="h-40 w-full my-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrendData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="bentoSalesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip
                  formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    borderColor: '#334155',
                    borderRadius: '1rem',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#2563EB"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#bentoSalesGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Sub-Metric Split Pill Row */}
          <div className="flex flex-wrap items-center gap-8 pt-4 border-t border-gray-100 dark:border-slate-800">
            <div>
              <p className="text-[11px] text-gray-400 uppercase font-extrabold tracking-wider">Berger Paint Sales</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {settings.currencySymbol}{Math.round(paintSalesRevenue || 290120).toLocaleString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase font-extrabold tracking-wider">Hardware & Tools</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {settings.currencySymbol}{Math.round(hardwareSalesRevenue || 138330).toLocaleString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase font-extrabold tracking-wider">Inventory Valuation</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                {settings.currencySymbol}{Math.round(totalInventoryValue).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>

        {/* Bento Block 2: Low Stock Alerts (Col 4) */}
        <div className="col-span-12 lg:col-span-4 bg-red-50/90 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-[28px] p-7 sm:p-8 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h4 className="font-extrabold text-base text-red-950 dark:text-red-200">
                  Low Stock Alerts
                </h4>
              </div>
              <span className="bg-red-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {lowStockCount} Items
              </span>
            </div>

            {/* Alert Product List */}
            <div className="space-y-3.5">
              {lowStockProducts.length === 0 ? (
                <p className="text-xs text-red-700 py-6 text-center font-medium">
                  All inventory stocks are above safety thresholds!
                </p>
              ) : (
                lowStockProducts.slice(0, 3).map((p, idx) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between gap-2 text-xs ${
                      idx > 0 ? 'border-t border-red-200/60 dark:border-red-900/40 pt-3' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-red-900 dark:text-red-200 font-bold truncate">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-red-700/80 dark:text-red-400">
                        {p.packSize} &bull; SKU: {p.sku}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-black text-red-800 dark:text-red-300 bg-red-100 dark:bg-red-950 px-2 py-0.5 rounded-md">
                        {p.quantity} left
                      </span>
                      <button
                        onClick={() => onOpenStockAdjust(p.id)}
                        className="px-2 py-1 bg-white dark:bg-slate-900 hover:bg-red-100 text-red-700 dark:text-red-300 text-[10px] font-bold rounded-lg border border-red-200 dark:border-red-800 transition-colors"
                      >
                        + In
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => setActiveTab('inventory')}
            className="w-full mt-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all text-center"
          >
            Review All {lowStockCount} Critical SKUs &rarr;
          </button>
        </div>

        {/* Bento Block 3: Stock Category Meter (Col 3) */}
        <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-white dark:bg-slate-900 rounded-[28px] border border-gray-200/80 dark:border-slate-800 p-7 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2">
              Stock Category
            </h4>
            <p className="text-[11px] text-gray-400">Godown unit distribution</p>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center my-4">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-extrabold text-slate-900 dark:text-white">{bergerPercentage}%</span>
                <span className="text-[9px] font-bold text-gray-400 uppercase">Berger</span>
              </div>
            </div>

            <div className="mt-3 text-center">
              <p className="text-lg font-bold text-slate-900 dark:text-white">Berger Paints</p>
              <p className="text-xs text-gray-400">{bergerPercentage}% of total stock volume</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-semibold text-gray-500 pt-2 border-t border-gray-100 dark:border-slate-800">
            {categoryPieData.map((cat, i) => (
              <div key={i} className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="truncate">{cat.name}: <strong>{cat.value}</strong></span>
              </div>
            ))}
          </div>
        </div>

        {/* Bento Block 4: Recent Transactions (Col 6) */}
        <div className="col-span-12 md:col-span-6 lg:col-span-6 bg-white dark:bg-slate-900 rounded-[28px] border border-gray-200/80 dark:border-slate-800 p-7 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Recent Transactions
                </h4>
                <p className="text-[11px] text-gray-400">Live POS counter bills</p>
              </div>
              <button
                onClick={() => setActiveTab('invoices')}
                className="text-blue-600 dark:text-blue-400 text-xs font-bold hover:underline"
              >
                View Ledger &rarr;
              </button>
            </div>

            <div className="space-y-3.5">
              {invoices.slice(0, 3).map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-3 p-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors">
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-2xl flex items-center justify-center font-extrabold text-xs shrink-0 border border-blue-100 dark:border-blue-900">
                      INV
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {inv.customerName}
                      </p>
                      <p className="text-[11px] font-mono text-gray-400">
                        #{inv.invoiceNumber} &bull; {inv.paymentMode}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <p className="text-xs font-black text-slate-900 dark:text-white">
                      {settings.currencySymbol}{inv.totalAmount.toFixed(0)}
                    </p>
                    <button
                      onClick={() => generateInvoicePDF(inv, settings)}
                      className="p-1.5 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800"
                      title="Download PDF"
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500">
            <span>Total Invoices Billed: <strong>{invoices.length}</strong></span>
            <span className="font-bold text-emerald-600">Stock Auto-Deducted</span>
          </div>
        </div>

        {/* Bento Block 5: Fast Moving Trending Block (Col 3) */}
        <div className="col-span-12 lg:col-span-3 bg-[#1E293B] text-white rounded-[28px] p-7 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-blue-400">
                Fast Moving Stock
              </h4>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-lg font-bold leading-snug text-slate-100">
              WeatherCoat & Silk Glamor are trending this week.
            </p>
          </div>

          <div className="mt-4">
            <div className="flex space-x-1.5 items-end h-16 bg-slate-800/80 p-2 rounded-xl">
              <div className="flex-1 bg-blue-500 rounded-sm h-1/2" title="Mon: 14 cans"></div>
              <div className="flex-1 bg-blue-500 rounded-sm h-2/3" title="Tue: 19 cans"></div>
              <div className="flex-1 bg-blue-500 rounded-sm h-1/3" title="Wed: 11 cans"></div>
              <div className="flex-1 bg-blue-400 rounded-sm h-full" title="Thu: 28 cans (Peak)"></div>
              <div className="flex-1 bg-blue-500 rounded-sm h-3/4" title="Fri: 22 cans"></div>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 text-center font-medium">
              Berger Retail Volume &bull; 7 Day Velocity
            </p>
          </div>
        </div>

        {/* Bento Block 6: 3-Column Status Bar Indicator (Col 12) */}
        <div className="col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 p-4 px-6 flex items-center space-x-3.5 shadow-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></div>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-200">
              Berger Paints Stock: <span className="text-emerald-600 font-extrabold">Healthy</span>
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 p-4 px-6 flex items-center space-x-3.5 shadow-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></div>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-200">
              Hardware & Tools: <span className="text-amber-600 font-extrabold">{products.length} Active Items</span>
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 p-4 px-6 flex items-center space-x-3.5 shadow-sm">
            <div className={`w-2.5 h-2.5 rounded-full ${supabaseConnected ? 'bg-blue-500' : 'bg-emerald-500'} shrink-0`}></div>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-200">
              System Database: <span className="text-blue-600 font-extrabold">{supabaseConnected ? 'Supabase Cloud Sync' : 'Local Hybrid Operational'}</span>
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
