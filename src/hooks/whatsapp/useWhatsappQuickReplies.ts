import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface WhatsappQuickReply {
  id: string;
  titulo: string;
  conteudo: string;
  atalho: string | null;
  variaveis: string[];
  ordem: number;
  ativo: boolean;
  mostrar_botao: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const MESSAGE_VARIABLES = [
  { key: '{nome}', label: 'Nome do Cliente', description: 'Nome do cliente ou contato' },
  { key: '{primeiro_nome}', label: 'Primeiro Nome', description: 'Primeiro nome do cliente' },
  { key: '{saudacao}', label: 'Saudação', description: 'Bom dia/Boa tarde/Boa noite conforme horário' },
  { key: '{numero_pedido}', label: 'Número do Pedido', description: 'Número do último pedido' },
  { key: '{data_entrega}', label: 'Data de Entrega', description: 'Data prevista de entrega (dd/mm/aaaa)' },
  { key: '{estimativa_entrega}', label: 'Estimativa de Entrega', description: 'Prazo em dias úteis (ex: 6 a 11 dias)' },
  { key: '{codigo_rastreio}', label: 'Código de Rastreio', description: 'Código de rastreio do envio' },
  { key: '{pix}', label: 'Código PIX', description: 'Código PIX do pedido (se pendente)' },
  { key: '{produtos_carrinho}', label: 'Produtos Carrinho', description: 'Lista de produtos do carrinho abandonado (um por linha)' },
  { key: '{link_carrinho}', label: 'Link Carrinho', description: 'Link para recuperar o carrinho abandonado' },
];

export function useWhatsappQuickReplies() {
  return useQuery({
    queryKey: ['whatsapp-quick-replies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_quick_replies')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) throw error;
      return data as WhatsappQuickReply[];
    }
  });
}

export function useAllWhatsappQuickReplies() {
  return useQuery({
    queryKey: ['whatsapp-quick-replies-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_quick_replies')
        .select('*')
        .order('ordem', { ascending: true });

      if (error) throw error;
      return data as WhatsappQuickReply[];
    }
  });
}

export function useCreateQuickReply() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Omit<WhatsappQuickReply, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { error } = await supabase
        .from('whatsapp_quick_replies')
        .insert({
          ...data,
          created_by: user?.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-quick-replies'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-quick-replies-all'] });
      toast.success('Resposta rápida criada');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar resposta: ${error.message}`);
    }
  });
}

export function useUpdateQuickReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<WhatsappQuickReply> & { id: string }) => {
      const { error } = await supabase
        .from('whatsapp_quick_replies')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-quick-replies'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-quick-replies-all'] });
      toast.success('Resposta rápida atualizada');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar resposta: ${error.message}`);
    }
  });
}

export function useDeleteQuickReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('whatsapp_quick_replies')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-quick-replies'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-quick-replies-all'] });
      toast.success('Resposta rápida removida');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover resposta: ${error.message}`);
    }
  });
}

// Função para obter saudação baseada no horário
export function getSaudacao(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

// Calcula dias úteis entre duas datas
export function calcularDiasUteis(dataInicio: Date, dataFim: Date): number {
  let dias = 0;
  const current = new Date(dataInicio);
  current.setHours(0, 0, 0, 0);
  const end = new Date(dataFim);
  end.setHours(0, 0, 0, 0);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      dias++;
    }
    current.setDate(current.getDate() + 1);
  }
  return dias;
}

// Gera string de estimativa de entrega (ex: "16 a 21 dias úteis")
export function gerarEstimativaEntrega(dataPedido: string, dataEntrega: string): string {
  const inicio = new Date(dataPedido + 'T12:00:00');
  const fim = new Date(dataEntrega + 'T12:00:00');
  
  const diasUteis = calcularDiasUteis(inicio, fim);
  // Margem de 5 dias úteis para variação de processamento
  const margemMinima = Math.max(1, diasUteis - 5);
  
  return `${margemMinima} a ${diasUteis} dias úteis`;
}

// Função para substituir variáveis no conteúdo
export function replaceVariables(
  content: string, 
  context: {
    nome?: string;
    numeroPedido?: string;
    dataEntrega?: string;
    dataPedido?: string;
    codigoRastreio?: string;
    codigoPix?: string;
  }
): string {
  let result = content;
  
  // Saudação baseada no horário
  result = result.replace(/{saudacao}/gi, getSaudacao());
  
  if (context.nome) {
    result = result.replace(/{nome}/gi, context.nome);
    result = result.replace(/{primeiro_nome}/gi, context.nome.split(' ')[0]);
  }
  
  if (context.numeroPedido) {
    result = result.replace(/{numero_pedido}/gi, context.numeroPedido);
  }
  
  if (context.dataEntrega) {
    // Formatar data para dd/mm/aaaa
    const date = new Date(context.dataEntrega + 'T12:00:00');
    const formatted = date.toLocaleDateString('pt-BR');
    result = result.replace(/{data_entrega}/gi, formatted);
    
    // Estimativa de entrega em dias úteis
    if (context.dataPedido) {
      const estimativa = gerarEstimativaEntrega(context.dataPedido, context.dataEntrega);
      result = result.replace(/{estimativa_entrega}/gi, estimativa);
    }
  }
  
  if (context.codigoRastreio) {
    result = result.replace(/{codigo_rastreio}/gi, context.codigoRastreio);
  }
  
  if (context.codigoPix) {
    result = result.replace(/{pix}/gi, context.codigoPix);
  }
  
  return result;
}
