export type Role = 'admin' | 'staff';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  is_verified?: boolean;
  avatarUrl?: string;
  phone?: string;
  joinedDate?: string;
  token?: string;
}

export interface SentEmailLogItem {
  id: string;
  to: string;
  subject: string;
  otp: string;
  verificationToken: string;
  verificationLink: string;
  expiresAt: string;
  sentAt: string;
  htmlContent: string;
  status: 'delivered' | 'simulated' | 'error';
}

export type ProductCategory = 
  | 'Berger Paints' 
  | 'Exterior Emulsions'
  | 'Interior Emulsions'
  | 'Enamels & Gloss'
  | 'Primers & Undercoats'
  | 'Waterproofing & Chemicals'
  | 'Hardware & Tools'
  | 'Brushes & Rollers'
  | 'Abrasives & Sandpaper'
  | 'Adhesives & Sealants'
  | 'Fasteners & Fixtures'
  | 'Plumbing & Electrical';

export interface Product {
  id: string;
  hsn?: string; // HSN / SAC code (non-mandatory)
  sku?: string; // Legacy fallback
  name: string;
  category: ProductCategory;
  brand: string; // e.g., 'Berger', 'Taparia', 'Bosch', 'Pidilite', 'Stanley', 'Norton'
  packSize: string; // e.g., '1 Litre', '4 Litre', '10 Litre', '20 Litre', '1 Pc', 'Pack of 10'
  quantity: number; // current stock units
  minStockAlert: number; // threshold for low stock alert
  costPrice: number; // purchase price
  unitPrice: number; // selling MRP / Retail price
  finish?: string; // Matt, Gloss, Satin, Silk, Metallic, High Gloss
  shadeCode?: string; // Berger shade code e.g., '0142 Morning Dew'
  locationRack?: string; // e.g., 'Rack A-3', 'Godown B-2'
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  productId: string;
  hsn?: string; // HSN Code (non-mandatory)
  sku?: string;
  name: string;
  category: string;
  brand: string;
  packSize: string;
  unitPrice: number;
  quantity: number;
  discountPercent: number;
  taxPercent: number; // e.g. 18% for paints/hardware
  total: number;
}

export type PaymentMode = 'Cash' | 'UPI / GPay / PhonePe' | 'Credit Card / Debit Card' | 'Bank Transfer (NEFT/RTGS)' | 'Credit (Khata)';
export type PaymentStatus = 'Paid' | 'Pending' | 'Partial';

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. TR-2026-1045
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
  customerGst?: string;
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  taxPercent: number;
  totalAmount: number;
  paymentMode: PaymentMode;
  paymentStatus: PaymentStatus;
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface StockAdjustmentLog {
  id: string;
  productId: string;
  productName: string;
  hsn?: string;
  sku?: string;
  type: 'in' | 'out' | 'sale' | 'adjustment' | 'damage';
  quantityChange: number;
  newQuantity: number;
  reason: string;
  performedBy: string;
  createdAt: string;
}

export interface StoreSettings {
  businessName: string;
  tagline: string;
  dealerFor: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  bankName: string;
  accountName?: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  invoicePrefix: string;
  defaultTaxPercent: number;
  termsAndConditions: string;
  currencySymbol: string;
}

export type ActiveTab = 'landing' | 'dashboard' | 'inventory' | 'billing' | 'invoices' | 'settings' | 'auth';
