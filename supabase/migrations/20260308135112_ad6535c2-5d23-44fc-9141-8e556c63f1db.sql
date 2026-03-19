
-- Add API credential columns to ecommerce_stores
ALTER TABLE public.ecommerce_stores
  ADD COLUMN IF NOT EXISTS wbuy_api_user text,
  ADD COLUMN IF NOT EXISTS wbuy_api_password text;

-- Add enrichment columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_installments integer,
  ADD COLUMN IF NOT EXISTS subtotal numeric,
  ADD COLUMN IF NOT EXISTS shipping_cost numeric,
  ADD COLUMN IF NOT EXISTS discount numeric,
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS wbuy_customer_id text,
  ADD COLUMN IF NOT EXISTS order_date timestamptz,
  ADD COLUMN IF NOT EXISTS nfe_number text,
  ADD COLUMN IF NOT EXISTS nfe_series text,
  ADD COLUMN IF NOT EXISTS enriched_at timestamptz;
