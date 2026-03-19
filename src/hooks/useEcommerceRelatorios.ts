import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Status codes que indicam pagamento confirmado
const PAID_STATUS_CODES = [3, 4, 5, 6, 7, 8, 10, 15, 16];

interface OrderItem {
  name?: string;
  sku?: string;
  price?: number;
  quantity?: number;
  size?: string;
  color?: string;
}

interface ReportFilters {
  startDate: string;
  endDate: string;
  storeCode?: string;
}

interface DailySummary {
  date: string;
  totalOrders: number;
  paidOrders: number;
  avgTicket: number;
  totalBilled: number;
}

interface ProductSummary {
  sku: string;
  name: string;
  qtyPaid: number;
  qtyUnpaid: number;
  qtyTotal: number;
  totalBilled: number;
}

function useOrdersForReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['orders-report', filters],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('created_at, wbuy_status_code, total, items, store_code')
        .gte('created_at', filters.startDate)
        .lte('created_at', filters.endDate + 'T23:59:59')
        .order('created_at', { ascending: false });

      if (filters.storeCode) {
        query = query.eq('store_code', filters.storeCode);
      }

      // Fetch all pages (orders table may exceed 1000 rows limit)
      const allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await query.range(from, from + pageSize - 1);
        if (error) throw error;
        if (data) {
          allData.push(...data);
          hasMore = data.length === pageSize;
          from += pageSize;
        } else {
          hasMore = false;
        }
      }

      return allData;
    },
    enabled: !!filters.startDate && !!filters.endDate,
  });
}

export function useDailySalesReport(filters: ReportFilters) {
  const { data: orders, isLoading, error } = useOrdersForReport(filters);

  const report = useMemo(() => {
    if (!orders?.length) return { rows: [] as DailySummary[], totals: { totalOrders: 0, paidOrders: 0, avgTicket: 0, totalBilled: 0 } };

    const byDay = new Map<string, { total: number; paid: number; billed: number }>();

    for (const order of orders) {
      const day = order.created_at.substring(0, 10);
      const isPaid = PAID_STATUS_CODES.includes(order.wbuy_status_code);
      const entry = byDay.get(day) || { total: 0, paid: 0, billed: 0 };
      entry.total++;
      if (isPaid) {
        entry.paid++;
        entry.billed += Number(order.total) || 0;
      }
      byDay.set(day, entry);
    }

    const rows: DailySummary[] = Array.from(byDay.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, v]) => ({
        date,
        totalOrders: v.total,
        paidOrders: v.paid,
        avgTicket: v.paid > 0 ? v.billed / v.paid : 0,
        totalBilled: v.billed,
      }));

    const totalOrders = rows.reduce((s, r) => s + r.totalOrders, 0);
    const paidOrders = rows.reduce((s, r) => s + r.paidOrders, 0);
    const totalBilled = rows.reduce((s, r) => s + r.totalBilled, 0);

    return {
      rows,
      totals: {
        totalOrders,
        paidOrders,
        avgTicket: paidOrders > 0 ? totalBilled / paidOrders : 0,
        totalBilled,
      },
    };
  }, [orders]);

  return { ...report, isLoading, error };
}

export function useProductSalesReport(filters: ReportFilters, searchTerm: string) {
  const { data: orders, isLoading, error } = useOrdersForReport(filters);

  const report = useMemo(() => {
    if (!orders?.length || !searchTerm.trim()) return { rows: [] as ProductSummary[], totals: { qtyPaid: 0, qtyUnpaid: 0, qtyTotal: 0, totalBilled: 0 } };

    const term = searchTerm.toLowerCase();
    const bySku = new Map<string, ProductSummary>();

    for (const order of orders) {
      const isPaid = PAID_STATUS_CODES.includes(order.wbuy_status_code);
      const items = (Array.isArray(order.items) ? order.items : []) as OrderItem[];

      for (const item of items) {
        if (!item.name?.toLowerCase().includes(term)) continue;
        const sku = item.sku || 'SEM-SKU';
        const qty = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;

        const entry = bySku.get(sku) || { sku, name: item.name || '', qtyPaid: 0, qtyUnpaid: 0, qtyTotal: 0, totalBilled: 0 };
        entry.qtyTotal += qty;
        if (isPaid) {
          entry.qtyPaid += qty;
          entry.totalBilled += price * qty;
        } else {
          entry.qtyUnpaid += qty;
        }
        bySku.set(sku, entry);
      }
    }

    const rows = Array.from(bySku.values()).sort((a, b) => b.qtyTotal - a.qtyTotal);
    const totals = rows.reduce(
      (acc, r) => ({
        qtyPaid: acc.qtyPaid + r.qtyPaid,
        qtyUnpaid: acc.qtyUnpaid + r.qtyUnpaid,
        qtyTotal: acc.qtyTotal + r.qtyTotal,
        totalBilled: acc.totalBilled + r.totalBilled,
      }),
      { qtyPaid: 0, qtyUnpaid: 0, qtyTotal: 0, totalBilled: 0 }
    );

    return { rows, totals };
  }, [orders, searchTerm]);

  return { ...report, isLoading, error };
}

export function useProductRanking(filters: ReportFilters, limit: number = 20) {
  const { data: orders, isLoading, error } = useOrdersForReport(filters);

  const report = useMemo(() => {
    if (!orders?.length) return { rows: [] as ProductSummary[] };

    const bySku = new Map<string, { name: string; qty: number; billed: number }>();

    for (const order of orders) {
      if (!PAID_STATUS_CODES.includes(order.wbuy_status_code)) continue;
      const items = (Array.isArray(order.items) ? order.items : []) as OrderItem[];

      for (const item of items) {
        const sku = item.sku || item.name || 'SEM-SKU';
        const qty = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        const entry = bySku.get(sku) || { name: item.name || sku, qty: 0, billed: 0 };
        entry.qty += qty;
        entry.billed += price * qty;
        bySku.set(sku, entry);
      }
    }

    const rows = Array.from(bySku.entries())
      .map(([sku, v]) => ({ sku, name: v.name, qtyPaid: v.qty, qtyUnpaid: 0, qtyTotal: v.qty, totalBilled: v.billed }))
      .sort((a, b) => b.qtyPaid - a.qtyPaid)
      .slice(0, limit);

    return { rows };
  }, [orders, limit]);

  return { ...report, isLoading, error };
}
