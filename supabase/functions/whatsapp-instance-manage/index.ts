import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  action: 'create' | 'connect' | 'disconnect' | 'delete' | 'check-status' | 'set-webhook' | 'get-qrcode' | 'restart';
  instanceId?: string;
  instanceName?: string;
  webhookUrl?: string;
}

// Função para migrar conversas órfãs (de instâncias excluídas) para a instância atual
async function migrateOrphanConversations(supabase: any, currentInstanceId: string, numeroWhatsapp: string) {
  if (!currentInstanceId || !numeroWhatsapp) return;
  
  console.log('Verificando conversas órfãs para número:', numeroWhatsapp);
  
  try {
    // Buscar todas as instâncias existentes para saber quais IDs ainda são válidos
    const { data: activeInstances } = await supabase
      .from('whatsapp_instances')
      .select('id');
    
    const activeInstanceIds = (activeInstances || []).map((i: any) => i.id);
    
    // Buscar conversas que tenham mensagens enviadas/recebidas pelo número da instância
    // Isso significa conversas onde a instância foi usada
    // Primeiro, buscar a instância antiga pelo número
    const { data: oldInstancesWithSameNumber } = await supabase
      .from('whatsapp_instances')
      .select('id')
      .eq('numero_whatsapp', numeroWhatsapp)
      .neq('id', currentInstanceId);
    
    // Buscar conversas órfãs: instance_id IS NULL (SET NULL após delete) ou instância inexistente
    const { data: orphanConversations } = await supabase
      .from('whatsapp_conversations')
      .select('id, instance_id')
      .is('instance_id', null);
    
    // Também buscar conversas com instância que não existe mais
    const { data: otherConversations } = await supabase
      .from('whatsapp_conversations')
      .select('id, instance_id')
      .not('instance_id', 'is', null)
      .neq('instance_id', currentInstanceId);
    
    let migratedCount = 0;
    
    // Migrar conversas com instance_id = null (órfãs após SET NULL)
    for (const conv of orphanConversations || []) {
      console.log('Migrando conversa órfã (null):', conv.id);
      await supabase.from('whatsapp_conversations').update({ instance_id: currentInstanceId }).eq('id', conv.id);
      await supabase.from('whatsapp_messages').update({ instance_id: currentInstanceId }).eq('conversation_id', conv.id);
      migratedCount++;
    }
    
    // Migrar conversas com instância inexistente
    for (const conv of otherConversations || []) {
      const instanceExists = activeInstanceIds.includes(conv.instance_id);
      if (!instanceExists) {
        console.log('Migrando conversa órfã (instância inexistente):', conv.id);
        await supabase.from('whatsapp_conversations').update({ instance_id: currentInstanceId }).eq('id', conv.id);
        await supabase.from('whatsapp_messages').update({ instance_id: currentInstanceId }).eq('conversation_id', conv.id);
        migratedCount++;
      }
    }
    
    if (migratedCount > 0) {
      console.log(`Migradas ${migratedCount} conversas órfãs para instância ${currentInstanceId}`);
    }
  } catch (e) {
    console.error('Erro ao migrar conversas órfãs:', e);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!evolutionApiUrl || !evolutionApiKey) {
      throw new Error('Evolution API não configurada');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: RequestBody = await req.json();
    const { action, instanceId, instanceName, webhookUrl } = body;

    console.log('Action:', action, 'InstanceId:', instanceId, 'InstanceName:', instanceName);

    let result: any = {};

    // Remove trailing slash and /manager suffix if present
    const baseUrl = evolutionApiUrl
      .replace(/\/+$/, '')
      .replace(/\/manager$/i, '');
    
    console.log('Evolution API base URL:', baseUrl);

    switch (action) {
      case 'create': {
        if (!instanceName) throw new Error('instanceName é obrigatório');

        // Evolution API v2 - criar instância
        const createUrl = `${baseUrl}/instance/create`;
        console.log('Creating instance at:', createUrl);
        
        const response = await fetch(createUrl, {
          method: 'POST',
          headers: {
            'apikey': evolutionApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            instanceName,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS'
          })
        });

        const data = await response.json();
        console.log('Evolution create response:', response.status, JSON.stringify(data));

        if (!response.ok) {
          throw new Error(data.response?.message?.[0] || data.message || 'Erro ao criar instância');
        }

        result = { 
          success: true, 
          instance: data.instance,
          qrcode: data.qrcode 
        };
        break;
      }

      case 'connect': {
        if (!instanceName) throw new Error('instanceName é obrigatório');

        // 1. Tentar deletar instância antiga da Evolution API (ignorar erros)
        try {
          console.log('Deletando instância antiga da Evolution:', instanceName);
          const delResponse = await fetch(`${baseUrl}/instance/delete/${instanceName}`, {
            method: 'DELETE',
            headers: { 'apikey': evolutionApiKey }
          });
          console.log('Delete old instance response:', delResponse.status);
        } catch (e) {
          console.log('Delete old instance falhou (ok, pode não existir):', e);
        }

        // 2. Aguardar 1 segundo
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 3. Criar instância nova com QR code
        console.log('Criando nova instância:', instanceName);
        const createConnResponse = await fetch(`${baseUrl}/instance/create`, {
          method: 'POST',
          headers: {
            'apikey': evolutionApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            instanceName,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS'
          })
        });

        const createConnData = await createConnResponse.json();
        console.log('Create new instance response:', createConnResponse.status, JSON.stringify(createConnData).substring(0, 500));

        if (!createConnResponse.ok) {
          throw new Error(createConnData.response?.message?.[0] || createConnData.message || 'Erro ao recriar instância');
        }

        // 4. Atualizar status no banco
        if (instanceId) {
          await supabase
            .from('whatsapp_instances')
            .update({ status: 'connecting' })
            .eq('id', instanceId);
        }

        result = { 
          success: true, 
          qrcode: createConnData.qrcode?.base64 || createConnData.qrcode,
          pairingCode: createConnData.pairingCode
        };
        break;
      }

      case 'get-qrcode': {
        if (!instanceName) throw new Error('instanceName é obrigatório');

        const response = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
          headers: { 'apikey': evolutionApiKey }
        });

        const data = await response.json();
        
        result = { 
          success: true, 
          qrcode: data.base64 || data.qrcode,
          pairingCode: data.pairingCode,
          state: data.state
        };
        break;
      }

      case 'disconnect': {
        if (!instanceName) throw new Error('instanceName é obrigatório');

        // 1. Logout da instância (ignorar erros)
        try {
          const logoutResp = await fetch(`${baseUrl}/instance/logout/${instanceName}`, {
            method: 'DELETE',
            headers: { 'apikey': evolutionApiKey }
          });
          console.log('Logout response:', logoutResp.status);
        } catch (e) {
          console.log('Logout falhou (ignorando):', e);
        }

        // 2. Deletar da Evolution API para limpar sessão completamente
        try {
          const delResp = await fetch(`${baseUrl}/instance/delete/${instanceName}`, {
            method: 'DELETE',
            headers: { 'apikey': evolutionApiKey }
          });
          console.log('Delete from Evolution response:', delResp.status);
        } catch (e) {
          console.log('Delete from Evolution falhou (ignorando):', e);
        }
        
        // 3. Atualizar status no banco
        if (instanceId) {
          await supabase
            .from('whatsapp_instances')
            .update({ status: 'disconnected' })
            .eq('id', instanceId);
        }

        result = { success: true };
        break;
      }

      case 'delete': {
        if (!instanceName) throw new Error('instanceName é obrigatório');

        // Tentar deletar da Evolution API (ignorar qualquer erro)
        try {
          const delResp = await fetch(`${baseUrl}/instance/delete/${instanceName}`, {
            method: 'DELETE',
            headers: { 'apikey': evolutionApiKey }
          });
          console.log('Delete from Evolution:', delResp.status);
        } catch (e) {
          console.log('Delete from Evolution falhou (ignorando para permitir exclusão do DB):', e);
        }

        result = { success: true };
        break;
      }

      case 'check-status': {
        // Verificar status de todas as instâncias ou de uma específica
        if (instanceName) {
          const response = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
            headers: { 'apikey': evolutionApiKey }
          });

          const data = await response.json();
          console.log('Connection state response:', JSON.stringify(data));
          
          // Evolution API pode retornar: open, close, connecting
          // Também pode retornar instance.state ou state diretamente
          const rawState = data?.instance?.state || data?.state || data?.status || 'unknown';
          const state = String(rawState);
          console.log('Parsed state:', state);
          
          // Mapear diferentes respostas possíveis
          const connectedStates = ['open', 'connected', 'online'];
          let status = connectedStates.includes(state.toLowerCase()) ? 'connected' : 'disconnected';
          console.log('Initial status:', status);

          // Buscar número do telefone conectado e verificar sessão corrompida via fetchInstances
          let numeroWhatsapp = null;
          let sessionCorrupted = false;
          if (status === 'connected') {
            try {
              const fetchResponse = await fetch(`${baseUrl}/instance/fetchInstances?instanceName=${instanceName}`, {
                headers: { 'apikey': evolutionApiKey }
              });
              const fetchData = await fetchResponse.json();
              console.log('FetchInstances response:', JSON.stringify(fetchData).substring(0, 1500));
              
              const instanceData = Array.isArray(fetchData) ? fetchData[0] : fetchData;
              
              // Detectar sessão corrompida: disconnectionReasonCode 401 ou device_removed
              const disconnectionCode = instanceData?.disconnectionReasonCode || instanceData?.instance?.disconnectionReasonCode;
              const disconnectionObject = JSON.stringify(instanceData?.disconnectionObject || instanceData?.instance?.disconnectionObject || '');
              
              if (disconnectionCode === 401 || disconnectionCode > 0) {
                console.log(`⚠️ Sessão corrompida detectada! disconnectionReasonCode: ${disconnectionCode}, disconnectionObject: ${disconnectionObject}`);
                sessionCorrupted = true;
                status = 'error';
              }
              
              if (disconnectionObject.includes('device_removed') || disconnectionObject.includes('conflict')) {
                console.log(`⚠️ Sessão corrompida por device_removed/conflict: ${disconnectionObject}`);
                sessionCorrupted = true;
                status = 'error';
              }
              
              // Extrair número
              const ownerJid = instanceData?.ownerJid || instanceData?.instance?.ownerJid;
              const owner = instanceData?.owner || instanceData?.instance?.owner;
              
              if (ownerJid) {
                numeroWhatsapp = ownerJid.split('@')[0];
              } else if (owner) {
                numeroWhatsapp = owner.split('@')[0].split(':')[0];
              } else {
                numeroWhatsapp = instanceData?.profileNumber || instanceData?.instance?.profileNumber || null;
              }
              
              console.log('Número capturado:', numeroWhatsapp, 'sessionCorrupted:', sessionCorrupted);
            } catch (e) {
              console.error('Erro ao buscar número da instância:', e);
            }
          }
          
          console.log('Final status:', status);

          // Atualizar status e número no banco
          const updateData: any = { status };
          if (numeroWhatsapp) {
            updateData.numero_whatsapp = numeroWhatsapp;
          }

          const targetId = instanceId || null;
          if (targetId) {
            await supabase
              .from('whatsapp_instances')
              .update(updateData)
              .eq('id', targetId);
          } else {
            await supabase
              .from('whatsapp_instances')
              .update(updateData)
              .eq('instance_name', instanceName);
          }

          // Se conectado com número, migrar conversas órfãs para esta instância
          if (status === 'connected' && numeroWhatsapp) {
            await migrateOrphanConversations(supabase, instanceId || '', numeroWhatsapp);
          }

          result = { 
            success: true, 
            instanceName,
            status,
            numeroWhatsapp,
            sessionCorrupted,
            rawState: state,
            rawData: data
          };
        } else {
          // Verificar todas as instâncias ativas
          const { data: instances } = await supabase
            .from('whatsapp_instances')
            .select('*')
            .eq('is_active', true);

          const statuses = [];
          for (const inst of instances || []) {
            try {
              const response = await fetch(`${baseUrl}/instance/connectionState/${inst.instance_name}`, {
                headers: { 'apikey': evolutionApiKey }
              });

              const data = await response.json();
              const status = data.state === 'open' ? 'connected' : 'disconnected';

              // Buscar número se conectado
              let numeroWhatsapp = null;
              if (status === 'connected') {
                try {
                  const fetchResponse = await fetch(`${baseUrl}/instance/fetchInstances?instanceName=${inst.instance_name}`, {
                    headers: { 'apikey': evolutionApiKey }
                  });
                  const fetchData = await fetchResponse.json();
                  const instanceData = Array.isArray(fetchData) ? fetchData[0] : fetchData;
                  const ownerJid = instanceData?.ownerJid || instanceData?.instance?.ownerJid;
                  const owner = instanceData?.owner || instanceData?.instance?.owner;
                  if (ownerJid) {
                    numeroWhatsapp = ownerJid.split('@')[0];
                  } else if (owner) {
                    numeroWhatsapp = owner.split('@')[0].split(':')[0];
                  }
                } catch (e) {
                  console.error('Erro ao buscar número:', e);
                }
              }

              const updateData: any = { status };
              if (numeroWhatsapp) updateData.numero_whatsapp = numeroWhatsapp;

              await supabase
                .from('whatsapp_instances')
                .update(updateData)
                .eq('id', inst.id);

              // Migrar conversas órfãs
              if (status === 'connected' && numeroWhatsapp) {
                await migrateOrphanConversations(supabase, inst.id, numeroWhatsapp);
              }

              statuses.push({ 
                id: inst.id, 
                instance_name: inst.instance_name, 
                status,
                numero_whatsapp: numeroWhatsapp
              });
            } catch (e: unknown) {
              await supabase
                .from('whatsapp_instances')
                .update({ status: 'error' })
                .eq('id', inst.id);

              statuses.push({ 
                id: inst.id, 
                instance_name: inst.instance_name, 
                status: 'error',
                error: e instanceof Error ? e.message : 'Erro desconhecido'
              });
            }
          }

          result = { success: true, instances: statuses };
        }
        break;
      }

      case 'set-webhook': {
        if (!instanceName) throw new Error('instanceName é obrigatório');
        if (!webhookUrl) throw new Error('webhookUrl é obrigatório');

        console.log('Setting webhook for', instanceName, 'to', webhookUrl);
        console.log('Base URL:', baseUrl);

        let response: Response;
        let data: any;
        let success = false;
        
        // Evolution API v2 usa body com propriedade "webhook" aninhada e requer "enabled"
        const webhookConfig = {
          webhook: {
            enabled: true,
            url: webhookUrl,
            byEvents: false,
            base64: true,
            events: [
              'MESSAGES_UPSERT',
              'MESSAGES_UPDATE', 
              'CONNECTION_UPDATE',
              'QRCODE_UPDATED'
            ]
          }
        };
        
        console.log('Trying webhook config v2:', JSON.stringify(webhookConfig));
        
        // Tentar POST em /webhook/set/{instanceName} com estrutura v2
        response = await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
          method: 'POST',
          headers: {
            'apikey': evolutionApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(webhookConfig)
        });

        data = await response.json();
        console.log('Webhook v2 response:', response.status, JSON.stringify(data));
        
        if (response.ok) {
          success = true;
        } else {
          // Tentar formato alternativo (flat)
          const flatWebhook = {
            url: webhookUrl,
            webhook_by_events: false,
            webhook_base64: true,
            events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE']
          };
          
          console.log('Trying flat webhook:', JSON.stringify(flatWebhook));
          
          response = await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
            method: 'POST',
            headers: {
              'apikey': evolutionApiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(flatWebhook)
          });
          data = await response.json();
          console.log('Flat webhook response:', response.status, JSON.stringify(data));
          
          if (response.ok) success = true;
        }
        
        // Tentar atualizar settings da instância
        if (!success) {
          console.log('Trying instance/settings endpoint...');
          response = await fetch(`${baseUrl}/instance/settings/${instanceName}`, {
            method: 'POST',
            headers: {
              'apikey': evolutionApiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              rejectCall: false,
              groupsIgnore: false,
              alwaysOnline: false,
              readMessages: false,
              readStatus: false,
              syncFullHistory: false,
              webhookUrl: webhookUrl,
              webhookByEvents: false,
              webhookBase64: true,
              webhookEvents: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE']
            })
          });
          data = await response.json();
          console.log('Settings response:', response.status, JSON.stringify(data));
          if (response.ok) success = true;
        }

        // Marcar como configurado no banco
        if (instanceId) {
          await supabase
            .from('whatsapp_instances')
            .update({ webhook_configured: true })
            .eq('id', instanceId);
        } else {
          await supabase
            .from('whatsapp_instances')
            .update({ webhook_configured: true })
            .eq('instance_name', instanceName);
        }

        result = { 
          success: true, 
          webhookSet: success,
          data,
          message: success ? 'Webhook configurado' : 'Erro ao configurar webhook - verifique configuração manual'
        };
        break;
      }

      case 'restart': {
        if (!instanceName) throw new Error('instanceName é obrigatório');
        
        console.log('Reiniciando instância (full reset):', instanceName);
        
        // 1. Logout da instância (ignorar erros)
        try {
          const logoutResponse = await fetch(`${baseUrl}/instance/logout/${instanceName}`, {
            method: 'DELETE',
            headers: { 'apikey': evolutionApiKey }
          });
          console.log('Logout response:', logoutResponse.status);
        } catch (e) {
          console.log('Logout falhou (ignorando):', e);
        }
        
        // 2. Deletar instância completamente da Evolution API (limpa sessão corrompida)
        try {
          const delResponse = await fetch(`${baseUrl}/instance/delete/${instanceName}`, {
            method: 'DELETE',
            headers: { 'apikey': evolutionApiKey }
          });
          console.log('Delete instance response:', delResponse.status);
        } catch (e) {
          console.log('Delete falhou (ignorando):', e);
        }
        
        // 3. Aguardar 2 segundos para a sessão limpar completamente
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 4. Recriar instância do zero com QR code
        console.log('Recriando instância:', instanceName);
        const restartCreateResponse = await fetch(`${baseUrl}/instance/create`, {
          method: 'POST',
          headers: {
            'apikey': evolutionApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            instanceName,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS'
          })
        });
        
        const restartCreateData = await restartCreateResponse.json();
        console.log('Recreate response:', restartCreateResponse.status, JSON.stringify(restartCreateData).substring(0, 500));
        
        if (!restartCreateResponse.ok) {
          throw new Error(restartCreateData.response?.message?.[0] || restartCreateData.message || 'Erro ao recriar instância');
        }
        
        // 5. Configurar webhook automaticamente
        const supabaseUrlForWebhook = Deno.env.get('SUPABASE_URL')!;
        const autoWebhookUrl = `${supabaseUrlForWebhook}/functions/v1/receive-whatsapp-webhook`;
        
        try {
          console.log('Configurando webhook automaticamente:', autoWebhookUrl);
          const webhookResp = await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
            method: 'POST',
            headers: {
              'apikey': evolutionApiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              webhook: {
                enabled: true,
                url: autoWebhookUrl,
                byEvents: false,
                base64: true,
                events: [
                  'MESSAGES_UPSERT',
                  'MESSAGES_UPDATE',
                  'CONNECTION_UPDATE',
                  'QRCODE_UPDATED'
                ]
              }
            })
          });
          console.log('Auto webhook response:', webhookResp.status);
        } catch (e) {
          console.log('Auto webhook falhou (pode configurar manualmente):', e);
        }
        
        // 6. Atualizar status no banco
        const restartTargetId = instanceId || null;
        const restartUpdate: any = { status: 'disconnected', webhook_configured: true };
        
        if (restartTargetId) {
          await supabase.from('whatsapp_instances').update(restartUpdate).eq('id', restartTargetId);
        } else {
          await supabase.from('whatsapp_instances').update(restartUpdate).eq('instance_name', instanceName);
        }
        
        result = {
          success: true,
          qrcode: restartCreateData.qrcode?.base64 || restartCreateData.qrcode,
          pairingCode: restartCreateData.pairingCode,
          message: 'Instância recriada com sucesso. Escaneie o novo QR code.'
        };
        break;
      }

      default:
        throw new Error(`Ação não reconhecida: ${action}`);
    }

    return new Response(JSON.stringify(result), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: unknown) {
    console.error('Erro na gestão de instância:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
