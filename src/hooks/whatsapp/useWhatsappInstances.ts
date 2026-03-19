import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WhatsappInstance {
  id: string;
  nome: string;
  instance_name: string;
  numero_whatsapp: string | null;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  is_active: boolean;
  ordem: number;
  foto_url: string | null;
  webhook_configured: boolean;
  created_at: string;
  updated_at: string;
  api_type?: 'evolution' | 'cloud_api';
  meta_phone_number_id?: string | null;
  meta_waba_id?: string | null;
  meta_display_phone_number?: string | null;
  meta_business_account_id?: string | null;
  meta_account_name?: string | null;
}

export function useWhatsappInstances() {
  return useQuery({
    queryKey: ['whatsapp-instances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .order('ordem', { ascending: true });
      
      if (error) throw error;
      return data as WhatsappInstance[];
    }
  });
}

export function useCreateWhatsappInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { nome: string; instance_name: string }) => {
      // Primeiro criar na Evolution API
      const { data: evolutionResult, error: evolutionError } = await supabase.functions
        .invoke('whatsapp-instance-manage', {
          body: { action: 'create', instanceName: data.instance_name }
        });

      if (evolutionError) throw evolutionError;
      if (!evolutionResult.success) throw new Error(evolutionResult.error);

      // Salvar no banco
      const { data: instance, error } = await supabase
        .from('whatsapp_instances')
        .insert({
          nome: data.nome,
          instance_name: data.instance_name,
          status: 'disconnected'
        })
        .select()
        .single();

      if (error) throw error;
      return { instance, qrcode: evolutionResult.qrcode };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      toast.success('Instância criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar instância: ${error.message}`);
    }
  });
}

export function useUpdateWhatsappInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<WhatsappInstance> & { id: string }) => {
      const { error } = await supabase
        .from('whatsapp_instances')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
    }
  });
}

export function useDeleteWhatsappInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, instance_name }: { id: string; instance_name: string }) => {
      // Fire-and-forget: tentar deletar na Evolution API sem esperar
      supabase.functions.invoke('whatsapp-instance-manage', {
        body: { action: 'delete', instanceName: instance_name }
      }).catch(e => console.log('Evolution API delete falhou (ignorando):', e));

      // Deletar no banco imediatamente
      const { error } = await supabase
        .from('whatsapp_instances')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      toast.success('Instância removida');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover instância: ${error.message}`);
    }
  });
}

export function useConnectInstance() {
  return useMutation({
    mutationFn: async ({ instanceId, instanceName }: { instanceId: string; instanceName: string }) => {
      const { data, error } = await supabase.functions
        .invoke('whatsapp-instance-manage', {
          body: { action: 'connect', instanceId, instanceName }
        });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    }
  });
}

export function useCheckInstanceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params?: { instanceId?: string; instanceName?: string }) => {
      const { data, error } = await supabase.functions
        .invoke('whatsapp-instance-manage', {
          body: { 
            action: 'check-status', 
            instanceId: params?.instanceId,
            instanceName: params?.instanceName 
          }
        });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      if (data.sessionCorrupted) {
        toast.error('Sessão corrompida detectada! Use "Reiniciar" para reconectar.');
      }
    }
  });
}

export function useRestartInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ instanceId, instanceName }: { instanceId: string; instanceName: string }) => {
      const { data, error } = await supabase.functions
        .invoke('whatsapp-instance-manage', {
          body: { action: 'restart', instanceId, instanceName }
        });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      toast.success('Instância reiniciada. Escaneie o novo QR code.');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao reiniciar: ${error.message}`);
    }
  });
}

export function useGetQRCode() {
  return useMutation({
    mutationFn: async (instanceName: string) => {
      const { data, error } = await supabase.functions
        .invoke('whatsapp-instance-manage', {
          body: { action: 'get-qrcode', instanceName }
        });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    }
  });
}

export function useSetWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ instanceId, instanceName }: { instanceId: string; instanceName: string }) => {
      // Get the Supabase URL dynamically
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const webhookUrl = `${supabaseUrl}/functions/v1/receive-whatsapp-webhook`;
      
      console.log('Configuring webhook:', webhookUrl);
      
      const { data, error } = await supabase.functions
        .invoke('whatsapp-instance-manage', {
          body: { 
            action: 'set-webhook', 
            instanceId,
            instanceName,
            webhookUrl 
          }
        });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      toast.success('Webhook configurado');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao configurar webhook: ${error.message}`);
    }
  });
}

export function useDisconnectInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ instanceId, instanceName }: { instanceId: string; instanceName: string }) => {
      const { data, error } = await supabase.functions
        .invoke('whatsapp-instance-manage', {
          body: { action: 'disconnect', instanceId, instanceName }
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      toast.success('Instância desconectada');
    }
  });
}
