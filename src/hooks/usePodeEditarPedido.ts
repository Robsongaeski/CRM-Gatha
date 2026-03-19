import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const usePodeEditarPedido = (pedidoId?: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['pode-editar-pedido', pedidoId, user?.id],
    queryFn: async () => {
      if (!pedidoId || !user) return false;
      
      const { data, error } = await supabase
        .rpc('pode_editar_pedido' as any, {
          p_pedido_id: pedidoId,
          p_usuario_id: user.id
        });
      
      if (error) {
        // Fallback robusto para QUALQUER erro na RPC
        console.warn('RPC pode_editar_pedido falhou, aplicando fallback:', error);
        
        // 1) Se for admin, pode editar tudo
        try {
          const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin' as any, {
            _user_id: user.id,
          });
          
          if (!adminError && isAdmin) return true;
        } catch (e) {
          console.error('Erro ao verificar admin:', e);
        }
        
        // 2) Verificar se existe pagamento aprovado
        try {
          const { data: pagamentosAprovados, error: pagError } = await supabase
            .from('pagamentos')
            .select('id')
            .eq('pedido_id', pedidoId)
            .eq('status', 'aprovado')
            .eq('estornado', false)
            .limit(1);
          
          if (pagError) {
            console.error('Erro ao verificar pagamentos:', pagError);
            return false;
          }
          
          // Se tem pagamento aprovado, não pode editar
          return !pagamentosAprovados || pagamentosAprovados.length === 0;
        } catch (e) {
          console.error('Erro no fallback de pagamentos:', e);
          return false;
        }
      }
      
      return data || false;
    },
    enabled: !!pedidoId && !!user,
  });
};
