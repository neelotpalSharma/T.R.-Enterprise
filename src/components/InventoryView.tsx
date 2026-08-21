import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  FileSpreadsheet,
  Paintbrush,
  Wrench,
  Sparkles,
  ArrowUpDown,
  RefreshCw,
  PackageCheck,
  Eye,
  X
} from 'lucide-react';
import { Product } from '../types';

interface InventoryViewProps {
  onOpenAddProduct: () => void;
  onOpenEditProduct: (product: Product) => void;
  onOpenStockAdjust: (productId: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  onOpenAddProduct,
  onOpenEditProduct,
  onOpenStockAdjust
}) => {
  const { products, deleteProduct, settings, isAdmin, showToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [filterStockStatus, setFilterStockStatus] = useState<'all' | 'low_stock' | 'in_stock'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'price' | 'updated'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Selected product for detail inspection drawer/modal
  const [inspectProduct, setInspectProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Extract unique brands and categories
  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.category));
    return ['All', ...Array.from(set)];
  }, [products]);

  const brands = useMemo(() => {
    const set = new Set(products.map(p => p.brand));
    return ['All', ...Array.from(set)];
  }, [products]);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter(product => {
        // Search text matching
        const matchesSearch =
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (product.hsn && product.hsn.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (product.shadeCode && product.shadeCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (product.locationRack && product.locationRack.toLowerCase().includes(searchQuery.toLowerCase())) ||
          product.brand.toLowerCase().includes(searchQuery.toLowerCase());

        // Category filter
        const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;

        // Brand filter
        const matchesBrand = selectedBrand === 'All' || product.brand === selectedBrand;

        // Stock status filter
        const matchesStock =
          filterStockStatus === 'all'
            ? true
            : filterStockStatus === 'low_stock'
            ? product.quantity <= product.minStockAlert
            : product.quantity > product.minStockAlert;

        return matchesSearch && matchesCategory && matchesBrand && matchesStock;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortBy === 'name') comp = a.name.localeCompare(b.name);
        else if (sortBy === 'quantity') comp = a.quantity - b.quantity;
        else if (sortBy === 'price') comp = a.unitPrice - b.unitPrice;
        else if (sortBy === 'updated') comp = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        return sortOrder === 'asc' ? comp : -comp;
      });
  }, [products, searchQuery, selectedCategory, selectedBrand, filterStockStatus, sortBy, sortOrder]);

  // Export Inventory as CSV
  const handleExportCSV = () => {
    const headers = ['HSN', 'Product Name', 'Category', 'Brand', 'Pack Size', 'Stock Qty', 'Min Alert', 'Cost Price', 'MRP Price', 'Finish', 'Shade Code', 'Rack Location'];
    const rows = filteredProducts.map(p => [
      `"${p.hsn || p.sku || ''}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      `"${p.brand}"`,
      `"${p.packSize}"`,
      p.quantity,
      p.minStockAlert,
      p.costPrice,
      p.unitPrice,
      `"${p.finish || ''}"`,
      `"${p.shadeCode || ''}"`,
      `"${p.locationRack || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TR_Enterprise_Inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Inventory exported to CSV successfully!', 'success');
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await deleteProduct(productToDelete.id);
      if (inspectProduct?.id === productToDelete.id) {
        setInspectProduct(null);
      }
      setProductToDelete(null);
    } catch (err: any) {
      showToast(`Error deleting product: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in">
      
      {/* Header & Primary Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Inventory & Stock Control
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
            Tracking {products.length} Berger Paints, Emulsions, Hardware Tools, and Adhesives
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 shadow-sm transition-colors"
            title="Export filtered table to CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            id="add-new-product-btn"
            onClick={onOpenAddProduct}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar Bento Card */}
      <div className="p-5 rounded-[28px] border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          
          {/* Search Input */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="inventory-search-input"
              type="text"
              placeholder="Search product, SKU, Berger shade, rack..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Dropdown */}
          <div className="lg:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  Category: {c}
                </option>
              ))}
            </select>
          </div>

          {/* Brand Dropdown */}
          <div className="lg:col-span-2">
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
            >
              {brands.map((b) => (
                <option key={b} value={b}>
                  Brand: {b}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Filter Pills */}
          <div className="lg:col-span-3 flex items-center gap-1.5">
            <button
              onClick={() => setFilterStockStatus('all')}
              className={`flex-1 py-2.5 rounded-2xl text-xs font-bold border text-center transition-colors ${
                filterStockStatus === 'all'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
              }`}
            >
              All ({products.length})
            </button>
            <button
              onClick={() => setFilterStockStatus('low_stock')}
              className={`flex-1 py-2.5 rounded-2xl text-xs font-bold border text-center transition-colors ${
                filterStockStatus === 'low_stock'
                  ? 'bg-red-600 text-white border-red-600 shadow-sm'
                  : 'border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/30'
              }`}
            >
              Low Stock
            </button>
          </div>

        </div>

      </div>

      {/* Products Table Bento Card */}
      <div className="rounded-[28px] border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            
            <thead className="bg-gray-50 dark:bg-slate-800/80 text-gray-700 dark:text-slate-200 uppercase tracking-wider text-[10px] font-extrabold border-b border-gray-200/80 dark:border-slate-800">
              <tr>
                <th className="px-5 py-4">Product & HSN</th>
                <th className="px-5 py-4">Category & Brand</th>
                <th className="px-5 py-4">Pack Size / Shade</th>
                <th className="px-5 py-4 text-center">Stock Level</th>
                <th className="px-5 py-4 text-right">MRP / Selling</th>
                {isAdmin && <th className="px-5 py-4 text-right">Cost Price</th>}
                <th className="px-5 py-4 text-center">Rack</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-medium">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    No products matched your search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.quantity <= p.minStockAlert;
                  const isOut = p.quantity === 0;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Product Name & HSN */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-2xl flex items-center justify-center font-extrabold text-xs shrink-0 ${
                              p.brand === 'Berger'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-100 dark:border-blue-900'
                                : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {p.brand === 'Berger' ? 'BP' : p.brand.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <button
                              onClick={() => setInspectProduct(p)}
                              className="text-slate-900 dark:text-white font-bold hover:text-blue-600 transition-colors text-left text-xs"
                            >
                              {p.name}
                            </button>
                            <p className="text-[11px] font-mono text-gray-400">
                              {(p.hsn || p.sku) ? `HSN: ${p.hsn || p.sku}` : 'HSN: —'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category & Brand */}
                      <td className="px-5 py-4">
                        <span className="inline-block px-2.5 py-1 rounded-xl text-[10px] font-bold bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300 mr-1.5">
                          {p.category}
                        </span>
                        <span className="text-gray-500 font-bold text-[11px]">
                          {p.brand}
                        </span>
                      </td>

                      {/* Pack Size & Shade */}
                      <td className="px-5 py-4">
                        <p className="text-slate-800 dark:text-slate-200 font-bold">
                          {p.packSize}
                        </p>
                        {p.shadeCode && (
                          <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                            {p.shadeCode}
                          </p>
                        )}
                      </td>

                      {/* Stock Level Badge */}
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-black ${
                              isOut
                                ? 'bg-red-600 text-white'
                                : isLow
                                ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}
                          >
                            {p.quantity} Units
                          </span>
                          {isLow && (
                            <span className="text-[10px] text-red-600 font-bold mt-0.5">
                              Alert &le; {p.minStockAlert}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* MRP / Selling Price */}
                      <td className="px-5 py-4 text-right font-extrabold text-slate-900 dark:text-white">
                        {settings.currencySymbol}{p.unitPrice.toFixed(2)}
                      </td>

                      {/* Cost Price (Admin Only) */}
                      {isAdmin && (
                        <td className="px-5 py-4 text-right text-gray-400 font-mono text-[11px]">
                          {settings.currencySymbol}{p.costPrice.toFixed(2)}
                        </td>
                      )}

                      {/* Godown Rack */}
                      <td className="px-5 py-4 text-center text-gray-500 text-[11px]">
                        <span className="px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-slate-800 font-mono font-semibold">
                          {p.locationRack || 'General'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Quick Adjust Button */}
                          <button
                            onClick={() => onOpenStockAdjust(p.id)}
                            className="p-2 rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                            title="Adjust Stock (+/-)"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>

                          {/* Edit Details */}
                          <button
                            onClick={() => onOpenEditProduct(p)}
                            className="p-2 rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete Item Button */}
                          <button
                            onClick={() => setProductToDelete(p)}
                            className="p-2 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer summary bar */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800/60 border-t border-gray-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-2">
          <span>
            Showing <strong>{filteredProducts.length}</strong> of <strong>{products.length}</strong> items in inventory
          </span>
          <span>
            Total Stock Value in view: <strong className="text-blue-600 dark:text-blue-400">{settings.currencySymbol}{Math.round(filteredProducts.reduce((acc, p) => acc + p.quantity * p.unitPrice, 0)).toLocaleString('en-IN')}</strong>
          </span>
        </div>

      </div>

      {/* Inspect Product Details Bento Modal */}
      {inspectProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-[28px] border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-7 relative">
            <button
              onClick={() => setInspectProduct(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-sm shadow-md shadow-blue-500/20">
                {inspectProduct.brand === 'Berger' ? 'BP' : inspectProduct.brand.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {inspectProduct.name}
                </h3>
                <p className="text-xs font-mono text-gray-400">
                  {(inspectProduct.hsn || inspectProduct.sku) ? `HSN: ${inspectProduct.hsn || inspectProduct.sku}` : 'HSN: Not Specified'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs mb-5">
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                <span className="text-gray-400 font-semibold">Category:</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">{inspectProduct.category}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                <span className="text-gray-400 font-semibold">Brand:</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">{inspectProduct.brand}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                <span className="text-gray-400 font-semibold">Pack Size:</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">{inspectProduct.packSize}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                <span className="text-gray-400 font-semibold">Stock Level:</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {inspectProduct.quantity} Units (Alert &le; {inspectProduct.minStockAlert})
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                <span className="text-gray-400 font-semibold">MRP / Selling:</span>
                <p className="font-extrabold text-blue-600 dark:text-blue-400 mt-0.5 text-sm">
                  {settings.currencySymbol}{inspectProduct.unitPrice.toFixed(2)}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                <span className="text-gray-400 font-semibold">Location / Rack:</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {inspectProduct.locationRack || 'Standard Shelf'}
                </p>
              </div>
            </div>

            {inspectProduct.description && (
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 text-xs mb-5">
                <span className="text-gray-400 font-semibold block mb-1">Product Description / Usage:</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {inspectProduct.description}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setProductToDelete(inspectProduct);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/70 border border-red-200 dark:border-red-900/60 transition-colors"
                title="Delete this product"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Item</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const p = inspectProduct;
                    setInspectProduct(null);
                    onOpenStockAdjust(p.id);
                  }}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-gray-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-gray-200 transition-colors"
                >
                  Stock In / Out
                </button>
                <button
                  onClick={() => {
                    const p = inspectProduct;
                    setInspectProduct(null);
                    onOpenEditProduct(p);
                  }}
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-colors"
                >
                  Edit Product
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-[28px] border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 shadow-2xl p-6 sm:p-7 relative space-y-5">
            
            <button
              onClick={() => setProductToDelete(null)}
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
                  Remove from Inventory?
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Are you sure you want to permanently delete this product?
                </p>
              </div>
            </div>

            {/* Product Summary Box */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-semibold">Product Name:</span>
                <span className="font-bold text-slate-900 dark:text-white text-right max-w-[200px] truncate">{productToDelete.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-semibold">SKU:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{productToDelete.sku}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-semibold">Category / Brand:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{productToDelete.category} ({productToDelete.brand})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-semibold">Pack Size:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{productToDelete.packSize}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-gray-200 dark:border-slate-700">
                <span className="text-gray-400 font-semibold">Current Stock:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{productToDelete.quantity} Units</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-[11px] text-red-700 dark:text-red-300">
              <strong>Notice:</strong> This action will remove the item from active stock valuation, catalog search, and POS billing lookups.
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-gray-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteProduct}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 active:scale-95 transition-all disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Removing...' : 'Yes, Delete Product'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
