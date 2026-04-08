import { PurchaseExtraCostInput, PurchaseItemInput } from './types';

export const PURCHASE_STATUS_LABELS: Record<string, string> = {
  quote: 'Orçamento',
  issued: 'Pedido emitido',
  partially_received: 'Parcialmente recebido',
  received: 'Recebido',
  cancelled: 'Cancelado',
};

export const PURCHASE_ALLOCATION_LABELS: Record<string, string> = {
  proportional_value: 'Proporcional ao valor',
  proportional_quantity: 'Proporcional à quantidade',
  manual: 'Manual',
  specific_item: 'Item específico',
};

export function safeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculatePurchasePreview(
  items: PurchaseItemInput[],
  extraCosts: PurchaseExtraCostInput[],
  freightTotal: number,
  insuranceTotal: number,
  taxTotal: number,
  otherCostTotal: number
) {
  const normalizedItems = items.map((item) => {
    const quantity = safeNumber(item.quantity);
    const unitPrice = safeNumber(item.unit_price);
    const discount = safeNumber(item.item_discount);
    const itemTotal = quantity * unitPrice - discount;
    return { ...item, quantity, unitPrice, discount, itemTotal };
  });

  const grossTotal = normalizedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountTotal = normalizedItems.reduce((sum, item) => sum + item.discount, 0);
  const itemsBaseTotal = normalizedItems.reduce((sum, item) => sum + item.itemTotal, 0);
  const extras = extraCosts.reduce((sum, item) => sum + safeNumber(item.amount), 0);

  const finalTotal =
    itemsBaseTotal +
    safeNumber(freightTotal) +
    safeNumber(insuranceTotal) +
    safeNumber(taxTotal) +
    safeNumber(otherCostTotal) +
    extras;

  return {
    grossTotal,
    discountTotal,
    itemsBaseTotal,
    extras,
    finalTotal,
  };
}
