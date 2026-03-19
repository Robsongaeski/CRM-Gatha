-- Adicionar status 'payment_denied' ao enum order_status
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'payment_denied';