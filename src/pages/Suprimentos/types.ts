export type SupplierStatus = 'active' | 'inactive';
export type PurchaseStatus = 'quote' | 'issued' | 'partially_received' | 'received' | 'cancelled';

export interface Supplier {
  id: string;
  corporate_name: string;
  trade_name: string | null;
  cnpj: string | null;
  contact_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  supplier_type: string;
  lead_time_days: number | null;
  payment_terms: string | null;
  status: SupplierStatus;
  created_at: string;
}

export interface PurchaseProduct {
  id: string;
  internal_code: string | null;
  name: string;
  category: string;
  unit: string;
  item_type: string;
  current_average_cost: number;
  status: SupplierStatus;
  preferred_supplier_id: string | null;
  created_at: string;
}

export interface Purchase {
  id: string;
  purchase_number: string;
  supplier_id: string | null;
  purchase_type: string;
  purchase_date: string;
  status: PurchaseStatus;
  gross_total: number;
  discount_total: number;
  freight_total: number;
  extra_cost_total: number;
  final_total: number;
  created_at: string;
}

export interface PurchaseItemInput {
  id?: string;
  product_id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  item_discount: number;
  notes: string;
}

export interface PurchaseExtraCostInput {
  id?: string;
  cost_type: string;
  description: string;
  amount: number;
  allocation_method: 'proportional_value' | 'proportional_quantity' | 'manual' | 'specific_item';
  specific_product_id: string | null;
}
