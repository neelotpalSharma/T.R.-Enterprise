import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Paintbrush, Package, Tag, Layers, MapPin, DollarSign, AlertTriangle, Trash2 } from 'lucide-react';
import { Product, ProductCategory } from '../types';

interface AddEditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

const CATEGORIES: ProductCategory[] = [
  'Berger Paints',
  'Exterior Emulsions',
  'Interior Emulsions',
  'Enamels & Gloss',
  'Primers & Undercoats',
  'Waterproofing & Chemicals',
  'Hardware & Tools',
  'Brushes & Rollers',
  'Abrasives & Sandpaper',
  'Adhesives & Sealants',
  'Fasteners & Fixtures',
  'Plumbing & Electrical'
];

export const AddEditProductModal: React.FC<AddEditProductModalProps> = ({
  isOpen,
  onClose,
  productToEdit
}) => {
  const { addProduct, updateProduct, deleteProduct, settings } = useApp();
  const [isDeleting, setIsDeleting] = useState(false);

  const [name, setName] = useState('');
  const [hsn, setHsn] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Berger Paints');
  const [brand, setBrand] = useState('Berger');
  const [packSize, setPackSize] = useState('20 Litre');
  const [quantity, setQuantity] = useState<number>(10);
  const [minStockAlert, setMinStockAlert] = useState<number>(5);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [finish, setFinish] = useState('');
  const [shadeCode, setShadeCode] = useState('');
  const [locationRack, setLocationRack] = useState('Godown A-1');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setHsn(productToEdit.hsn || productToEdit.sku || '');
      setCategory(productToEdit.category);
      setBrand(productToEdit.brand);
      setPackSize(productToEdit.packSize);
      setQuantity(productToEdit.quantity);
      setMinStockAlert(productToEdit.minStockAlert);
      setCostPrice(productToEdit.costPrice);
      setUnitPrice(productToEdit.unitPrice);
      setFinish(productToEdit.finish || '');
      setShadeCode(productToEdit.shadeCode || '');
      setLocationRack(productToEdit.locationRack || '');
      setDescription(productToEdit.description || '');
    } else {
      // Defaults for new product
      setName('');
      setHsn('');
      setCategory('Interior Emulsions');
      setBrand('Berger');
      setPackSize('4 Litre');
      setQuantity(10);
      setMinStockAlert(4);
      setCostPrice(1200);
      setUnitPrice(1550);
      setFinish('Rich Sheen');
      setShadeCode('');
      setLocationRack('Rack A-1');
      setDescription('');
    }
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (productToEdit) {
      await updateProduct(productToEdit.id, {
        name: name.trim(),
        hsn: hsn.trim().toUpperCase() || undefined,
        sku: hsn.trim().toUpperCase() || undefined,
        category,
        brand: brand.trim(),
        packSize: packSize.trim(),
        quantity: Number(quantity),
        minStockAlert: Number(minStockAlert),
        costPrice: Number(costPrice),
        unitPrice: Number(unitPrice),
        finish: finish.trim() || undefined,
        shadeCode: shadeCode.trim() || undefined,
        locationRack: locationRack.trim() || undefined,
        description: description.trim() || undefined
      });
    } else {
      await addProduct({
        name: name.trim(),
        hsn: hsn.trim().toUpperCase() || undefined,
        sku: hsn.trim().toUpperCase() || undefined,
        category,
        brand: brand.trim(),
        packSize: packSize.trim(),
        quantity: Number(quantity),
        minStockAlert: Number(minStockAlert),
        costPrice: Number(costPrice),
        unitPrice: Number(unitPrice),
        finish: finish.trim() || undefined,
        shadeCode: shadeCode.trim() || undefined,
        locationRack: locationRack.trim() || undefined,
        description: description.trim() || undefined
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 relative">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-md">
            <Paintbrush className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {productToEdit ? 'Edit Product Details' : 'Add New Inventory Item'}
            </h3>
            <p className="text-xs text-slate-500">
              Berger paints, hardware machines, sealants & tools
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* Product Name */}
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
                Product Name *
              </label>
              <input
                id="product-name-field"
                type="text"
                required
                placeholder="e.g. Berger WeatherCoat Long Life 10"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* HSN Code (Non-mandatory) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700 dark:text-slate-200">
                  HSN / SAC Code
                </label>
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Optional</span>
              </div>
              <input
                id="product-hsn-field"
                type="text"
                placeholder="e.g. 3208, 3209, 8205 (Optional)"
                value={hsn}
                onChange={(e) => setHsn(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
                Brand
              </label>
              <input
                type="text"
                placeholder="e.g. Berger, Taparia, Bosch"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Pack Size */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
                Pack Size / Unit
              </label>
              <input
                type="text"
                placeholder="e.g. 20 Litre, 4 Litre, 1 Pc, Box of 100"
                value={packSize}
                onChange={(e) => setPackSize(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Stock Quantity */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
                Current Stock (Units) *
              </label>
              <input
                id="product-qty-field"
                type="number"
                min={0}
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Min Stock Alert */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
                Low Stock Alert Threshold
              </label>
              <input
                type="number"
                min={1}
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Cost Price */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
                Cost / Inward Price ({settings.currencySymbol})
              </label>
              <input
                type="number"
                min={0}
                value={costPrice}
                onChange={(e) => setCostPrice(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Unit Price (MRP) */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
                MRP / Selling Price ({settings.currencySymbol}) *
              </label>
              <input
                id="product-price-field"
                type="number"
                min={0}
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-orange-600 dark:text-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Finish */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
                Paint Finish / Sheen
              </label>
              <input
                type="text"
                placeholder="e.g. Silk, High Gloss, Matt, Metallic"
                value={finish}
                onChange={(e) => setFinish(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Shade Code */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
                Berger Shade / Tint Code
              </label>
              <input
                type="text"
                placeholder="e.g. 0142 Morning Dew / Base White"
                value={shadeCode}
                onChange={(e) => setShadeCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Location / Rack */}
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
                Godown / Rack Location
              </label>
              <input
                type="text"
                placeholder="e.g. Rack A-3 (Ground Floor), Godown Shed 2"
                value={locationRack}
                onChange={(e) => setLocationRack(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
                Description / Technical Specifications
              </label>
              <textarea
                rows={2}
                placeholder="Coverage, application guidelines, warranty..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

          </div>

          <div className="flex items-center justify-between gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            {productToEdit ? (
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (window.confirm(`Are you sure you want to remove "${productToEdit.name}" from inventory?`)) {
                    setIsDeleting(true);
                    await deleteProduct(productToEdit.id);
                    setIsDeleting(false);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/60 transition-colors"
                title="Delete this product"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Item</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                id="save-product-modal-btn"
                type="submit"
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-600/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {productToEdit ? 'Update Product' : 'Save & Stock In'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
