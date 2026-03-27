import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

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
  api_type?: 'evolution' | 'cloud_api' | 'uazapi';
  meta_phone_number_id?: string | null;
  meta_waba_id?: string | null;
  meta_display_phone_number?: string | null;
  meta_business_account_id?: string | null;
  meta_account_name?: string | null;
  uazapi_instance_token?: string | null;
  uazapi_instance_external_id?: string | null;
}

function invalidateInstanceQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
  queryClient.invalidateQueries({ queryKey: ['whatsapp-user-instances'] });
}

export function useWhatsappInstances() {
  return useQuery({
    queryKey: ['whatsapp-instances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('is_active', true)
        .order('ordem', { ascending: true });
      
      if (error) throw error;
      return data as WhatsappInstance[];
    }
  });
}

export function useCreateWhatsappInstance() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

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

      // Garante que o criador tenha acesso imediato à instância
      if (user?.id) {
        await supabase
          .from('whatsapp_instance_users')
          .upsert(
            { instance_id: instance.id, user_id: user.id },
            { onConflict: 'instance_id,user_id', ignoreDuplicates: true },
          );
      }

      return { instance, qrcode: evolutionResult.qrcode };
    },
    onSuccess: () => {
      invalidateInstanceQueries(queryClient);
      toast.success('Instância criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar instância: ${error.message}`);
    }
  });
}

// Hook para criar instância UAZAPI
export function useCreateUazapiInstance() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { nome: string; instance_name: string }) => {
      // Criar na UAZAPI via Edge Function
      const { data: uazapiResult, error: uazapiError } = await supabase.functions
        .invoke('whatsapp-instance-manage', {
          body: { action: 'create', instanceName: data.instance_name, apiType: 'uazapi' }
        });

      if (uazapiError) throw uazapiError;
      if (!uazapiResult.success) throw new Error(uazapiResult.error);

      const insertPayload: Record<string, unknown> = {
        nome: data.nome,
        instance_name: data.instance_name,
        status: 'disconnected',
        api_type: 'uazapi',
      };

      if (uazapiResult.instanceToken) insertPayload.uazapi_instance_token = uazapiResult.instanceToken;
      if (uazapiResult.instanceExternalId) insertPayload.uazapi_instance_external_id = uazapiResult.instanceExternalId;

      let { data: instance, error } = await supabase
        .from('whatsapp_instances')
        .insert(insertPayload)
        .select()
        .single();

      if (error && /uazapi_instance_token|uazapi_instance_external_id/i.test(error.message || '')) {
        const fallbackPayload = {
          nome: data.nome,
          instance_name: data.instance_name,
          status: 'disconnected' as const,
          api_type: 'uazapi' as const,
        };
        const retry = await supabase
          .from('whatsapp_instances')
          .insert(fallbackPayload)
          .select()
          .single();
        instance = retry.data;
        error = retry.error;
      }

      if (error) throw error;

      // Garante que o criador tenha acesso imediato à instância
      if (user?.id && instance?.id) {
        await supabase
          .from('whatsapp_instance_users')
          .upsert(
            { instance_id: instance.id, user_id: user.id },
            { onConflict: 'instance_id,user_id', ignoreDuplicates: true },
          );
      }

      return { instance, qrcode: uazapiResult.qrcode };
    },
    onSuccess: () => {
      invalidateInstanceQueries(queryClient);
      toast.success('Instância UAZAPI criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar instância UAZAPI: ${error.message}`);
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
      invalidateInstanceQueries(queryClient);
    }
  });
}

export function useDeleteWhatsappInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      instance_name,
      api_type,
    }: {
      id: string;
      instance_name: string;
      api_type?: WhatsappInstance['api_type'];
    }) => {
      // Deleta primeiro no provedor para não ocupar slot remoto
      const { data: providerResult, error: providerError } = await supabase.functions.invoke(
        'whatsapp-instance-manage',
        {
          body: { action: 'delete', instanceId: id, instanceName: instance_name, apiType: api_type },
        },
      );

      if (providerError) throw providerError;
      if (!providerResult?.success) {
        throw new Error(providerResult?.error || 'Não foi possível remover a instância no provedor.');
      }

      // Soft delete para evitar timeout em cascata com muito histórico
      const { error } = await supabase
        .from('whatsapp_instances')
        .update({ is_active: false, status: 'disconnected' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateInstanceQueries(queryClient);
      toast.success('Instância removida');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover instância: ${error.message}`);
    }
  });
}

export function useConnectInstance() {
  return useMutation({
    mutationFn: async (
      { instanceId, instanceName, apiType }: { instanceId: string; instanceName: string; apiType?: WhatsappInstance['api_type'] },
    ) => {
      const { data, error } = await supabase.functions
        .invoke('whatsapp-instance-manage', {
          body: { action: 'connect', instanceId, instanceName, apiType }
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
    mutationFn: async (params?: { instanceId?: string; instanceName?: string; apiType?: WhatsappInstance['api_type'] }) => {
      const { data, error } = await supabase.functions
        .invoke('whatsapp-instance-manage', {
          body: { 
            action: 'check-status', 
            instanceId: params?.instanceId,
            instanceName: params?.instanceName,
            apiType: params?.apiType,
          }
        });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      invalidateInstanceQueries(queryClient);
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
    mutationFn: async (
      { instanceId, instanceName, apiType }: { instanceId: string; instanceName: string; apiType?: WhatsappInstance['api_type'] },
    ) => {
      const { data, error } = await supabase.functions
        .invoke('whatsapp-instance-manage', {
          body: { action: 'restart', instanceId, instanceName, apiType }
        });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      invalidateInstanceQueries(queryClient);
      toast.success('Instância reiniciada. Escaneie o novo QR code.');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao reiniciar: ${error.message}`);
    }
  });
}

export function useGetQRCode() {
  return useMutation({
    mutationFn: async (
      { instanceName, instanceId, apiType }: { instanceName: string; instanceId?: string; apiType?: WhatsappInstance['api_type'] },
    ) => {
      const { data, error } = await supabase.functions
        .invoke('whatsapp-instance-manage', {
          body: { action: 'get-qrcode', instanceName, instanceId, apiType }
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
    mutationFn: async (
      { instanceId, instanceName, apiType }: { instanceId: string; instanceName: string; apiType?: WhatsappInstance['api_type'] },
    ) => {
      // Get the Supabase URL dynamically
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const webhookPath = apiType === 'uazapi' ? 'receive-whatsapp-uazapi-webhook' : 'receive-whatsapp-webhook';
      const webhookUrl = `${supabaseUrl}/functions/v1/${webhookPath}`;
      
      console.log('Configuring webhook:', webhookUrl);
      
      const { data, error } = await supabase.functions
        .invoke('whatsapp-instance-manage', {
          body: { 
            action: 'set-webhook', 
            instanceId,
            instanceName,
            apiType,
            webhookUrl 
          }
        });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      invalidateInstanceQueries(queryClient);
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
    mutationFn: async (
      { instanceId, instanceName, apiType }: { instanceId: string; instanceName: string; apiType?: WhatsappInstance['api_type'] },
    ) => {
      const { data, error } = await supabase.functions
        .invoke('whatsapp-instance-manage', {
          body: { action: 'disconnect', instanceId, instanceName, apiType }
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateInstanceQueries(queryClient);
      toast.success('Instância desconectada');
    }
  });
}
