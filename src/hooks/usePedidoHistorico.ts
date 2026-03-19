import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePedidoHistorico = (pedidoId?: string) => {
  return useQuery({
    queryKey: ['pedido-historico', pedidoId],
    queryFn: async () => {
      if (!pedidoId) return [];
      
      // Busca o histórico e depois busca os dados dos usuários do auth.users via RPC ou query separada
      const { data: historico, error } = await supabase
        .from('pedidos_historico' as any)
        .select('*')
        .eq('pedido_id', pedidoId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar histórico:', error);
        return [];
      }

      if (!historico || historico.length === 0) return [];

      // Busca os dados dos usuários do profiles
      const usuarioIds = [...new Set(historico.map((h: any) => h.usuario_id).filter(Boolean))];
      
      if (usuarioIds.length === 0) return historico;

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nome, email')
        .in('id', usuarioIds);

      if (profilesError) {
        console.error('Erro ao buscar profiles:', profilesError);
        return historico; // Retorna sem os dados do usuário
      }

      // Mescla os dados
      const historicoComUsuarios = historico.map((h: any) => ({
        ...h,
        usuario: profiles?.find((p: any) => p.id === h.usuario_id) || null
      }));

      return historicoComUsuarios;
    },
    enabled: !!pedidoId,
  });
};
