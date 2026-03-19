import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay } from 'date-fns';

export function useRetornosPendentes() {
  return useQuery({
    queryKey: ['retornos-pendentes'],
    queryFn: async () => {
      const hoje = new Date();
      const inicioHoje = startOfDay(hoje).toISOString();
      const fimHoje = endOfDay(hoje).toISOString();

      const { data, error } = await supabase
        .from('leads' as any)
        .select(`
          *,
          segmento:segmentos(nome, cor, icone),
          vendedor:profiles!leads_vendedor_id_fkey(nome)
        `)
        .gte('data_retorno', inicioHoje)
        .lte('data_retorno', fimHoje)
        .in('status', ['novo', 'contatando', 'qualificado'])
        .order('data_retorno', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
    refetchInterval: 120000, // 2 minutos em vez de 1
  });
}

export function useRetornosCount() {
  const { data = [] } = useRetornosPendentes();
  return data.length;
}
