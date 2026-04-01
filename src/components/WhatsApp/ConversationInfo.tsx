import { useState, useEffect, useMemo } from 'react';
import { WhatsappConversation, useSaveInternalNotes } from '@/hooks/whatsapp/useWhatsappConversations';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { User, Building2, Save, ShoppingCart, Truck, ShoppingBag, Copy, ExternalLink, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatters';
import PedidoDetalheDialog from './PedidoDetalheDialog';
import EcommerceOrderDetailDialog from './EcommerceOrderDetailDialog';
import { AbandonedCart, AbandonedCartItem } from '@/hooks/useAbandonedCarts';

interface ConversationInfoProps {
  conversation: WhatsappConversation;
}

interface PedidoInternoResumo {
  id: string;
  numero_pedido: number;
  data_pedido: string;
  valor_total: number;
  status: string;
  etapa_producao_id: string | null;
  cliente_id?: string | null;
  cliente?: {
    id: string;
    nome_razao_social: string;
    telefone: string | null;
    whatsapp: string | null;
  } | null;
}

export default function ConversationInfo({ conversation }: ConversationInfoProps) {
  const [notes, setNotes] = useState(conversation.internal_notes || '');
  const [selectedPedido, setSelectedPedido] = useState<PedidoInternoResumo | null>(null);
  const [selectedEcommerceOrderId, setSelectedEcommerceOrderId] = useState<string | null>(null);
  const [expandedCartId, setExpandedCartId] = useState<string | null>(null);
  const [showAllEcommerceOrders, setShowAllEcommerceOrders] = useState(false);
  const [showAllInternalOrders, setShowAllInternalOrders] = useState(false);
  const ORDERS_INITIAL_VISIBLE = 3;
  const saveNotes = useSaveInternalNotes();

  // Sincronizar notas quando a conversa mudar
  useEffect(() => {
    setNotes(conversation.internal_notes || '');
    setExpandedCartId(null);
    setShowAllEcommerceOrders(false);
    setShowAllInternalOrders(false);
  }, [conversation.id, conversation.internal_notes]);

  // Normalizar telefone para busca (remover tudo exceto dígitos e código de país)
  const normalizePhone = (phone: string | null | undefined): string => {
    if (!phone) return '';
    let digits = phone.replace(/\D/g, '');
    // Remover código de país 55 se presente
    if (digits.length > 11 && digits.startsWith('55')) {
      digits = digits.substring(2);
    }
    return digits;
  };

  const contactPhoneNormalized = normalizePhone(conversation.contact_phone);

  // Extrair últimos 8 dígitos para busca flexível
  // Usa 8 dígitos para lidar com variação do 9º dígito entre sistemas
  const getPhoneSuffix = (phone: string): string => {
    let normalized = phone.replace(/\D/g, '');
    // Remover código de país 55
    if (normalized.length > 11 && normalized.startsWith('55')) {
      normalized = normalized.substring(2);
    }
    // Pega últimos 8 dígitos para máxima flexibilidade (ignora 9º dígito variável)
    return normalized.slice(-8);
  };

  // Comparar telefones de forma flexível (considerando 9º dígito opcional e código de país)
  const phoneMatches = (phone1: string, phone2: string): boolean => {
    let p1 = phone1.replace(/\D/g, '');
    let p2 = phone2.replace(/\D/g, '');
    
    // Remover código de país 55 de ambos
    if (p1.length > 11 && p1.startsWith('55')) p1 = p1.substring(2);
    if (p2.length > 11 && p2.startsWith('55')) p2 = p2.substring(2);
    
    if (p1.length < 8 || p2.length < 8) return false;
    
    // Comparação exata após normalização
    if (p1 === p2) return true;
    
    // Extrair DDD (2 primeiros dígitos) e número de cada telefone
    const ddd1 = p1.slice(0, 2);
    const ddd2 = p2.slice(0, 2);
    
    // Se DDDs são iguais, comparar os números sem o 9º dígito
    if (ddd1 === ddd2) {
      // Remover DDD e pegar últimos 8 dígitos do número
      const num1 = p1.slice(2).slice(-8);
      const num2 = p2.slice(2).slice(-8);
      if (num1 === num2) return true;
    }
    
    // Pegar os últimos 8 dígitos (número sem 9º dígito variável)
    const suffix1 = p1.slice(-8);
    const suffix2 = p2.slice(-8);
    
    if (suffix1 === suffix2) return true;
    
    // Comparar também últimos 9 dígitos (DDD + número com 9)
    const suffix1_9 = p1.slice(-9);
    const suffix2_9 = p2.slice(-9);
    
    if (suffix1_9 === suffix2_9) return true;
    
    // Se um tem 9 e outro não, comparar o menor com final do maior
    // Ex: 92023533 deve bater com 992023533
    if (suffix1_9.endsWith(suffix2) || suffix2_9.endsWith(suffix1)) return true;
    if (suffix1.endsWith(suffix2.slice(-8)) || suffix2.endsWith(suffix1.slice(-8))) return true;
    
    return false;
  };

  const contactPhoneSuffix = getPhoneSuffix(contactPhoneNormalized);

  // Fetch e-commerce orders by phone - usar RPC para buscar com telefone normalizado
  const { data: ecommerceOrders = [] } = useQuery({
    queryKey: ['ecommerce-orders-phone', contactPhoneSuffix],
    queryFn: async () => {
      if (!contactPhoneSuffix || contactPhoneSuffix.length < 8) return [];
      
      // Usar RPC que normaliza o telefone no banco antes de comparar
      const { data, error } = await supabase
        .rpc('search_orders_by_phone', { phone_suffix: contactPhoneSuffix });
      
      if (error) throw error;
      
      // Validação secundária para garantir precisão (DDD correto)
      return (data || []).filter(order => {
        return phoneMatches(order.customer_phone || '', contactPhoneNormalized);
      }).sort((a, b) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    },
    enabled: !!contactPhoneSuffix && contactPhoneSuffix.length >= 8,
  });

  // Fetch pedidos internos por cliente vinculado e fallback por telefone
  const { data: pedidosInternos = [] } = useQuery<PedidoInternoResumo[]>({
    queryKey: ['cliente-pedidos', conversation.cliente_id, contactPhoneSuffix],
    queryFn: async () => {
      const pedidosMap = new Map<string, PedidoInternoResumo>();

      if (conversation.cliente_id) {
        const { data, error } = await supabase
          .from('pedidos')
          .select(`
            id,
            numero_pedido,
            data_pedido,
            valor_total,
            status,
            etapa_producao_id,
            cliente_id,
            cliente:clientes(id, nome_razao_social, telefone, whatsapp)
          `)
          .eq('cliente_id', conversation.cliente_id)
          .order('data_pedido', { ascending: false })
          .limit(30);

        if (error) throw error;
        (data || []).forEach((pedido) => pedidosMap.set(pedido.id, pedido as PedidoInternoResumo));
      }

      if (contactPhoneSuffix && contactPhoneSuffix.length >= 8) {
        const { data, error } = await supabase
          .from('pedidos')
          .select(`
            id,
            numero_pedido,
            data_pedido,
            valor_total,
            status,
            etapa_producao_id,
            cliente_id,
            cliente:clientes(id, nome_razao_social, telefone, whatsapp)
          `)
          .order('data_pedido', { ascending: false })
          .limit(120);

        if (error) throw error;

        (data || []).forEach((pedido) => {
          const clientePedido = pedido.cliente as PedidoInternoResumo['cliente'];
          const telefoneCliente = clientePedido?.telefone || '';
          const whatsappCliente = clientePedido?.whatsapp || '';
          const matchTelefone = phoneMatches(telefoneCliente, contactPhoneNormalized);
          const matchWhatsapp = phoneMatches(whatsappCliente, contactPhoneNormalized);

          if (matchTelefone || matchWhatsapp) {
            pedidosMap.set(pedido.id, pedido as PedidoInternoResumo);
          }
        });
      }

      return Array.from(pedidosMap.values())
        .sort(
          (a, b) =>
            new Date(b.data_pedido || 0).getTime() - new Date(a.data_pedido || 0).getTime()
        )
        .slice(0, 50);
    },
    enabled: !!conversation.cliente_id || (!!contactPhoneSuffix && contactPhoneSuffix.length >= 8),
  });

  // Fetch abandoned carts by phone - usar RPC para buscar com telefone normalizado
  const { data: abandonedCarts = [] } = useQuery({
    queryKey: ['abandoned-carts-phone', contactPhoneSuffix],
    queryFn: async () => {
      if (!contactPhoneSuffix || contactPhoneSuffix.length < 8) return [];
      
      // Usar RPC que normaliza o telefone no banco antes de comparar
      const { data, error } = await supabase
        .rpc('search_abandoned_carts_by_phone', { phone_suffix: contactPhoneSuffix });
      
      if (error) throw error;
      
      // Validação secundária para garantir precisão (DDD correto) e formatar dados
      return (data || []).filter(cart => {
        return phoneMatches(cart.customer_phone || '', contactPhoneNormalized);
      }).map(cart => ({
        id: cart.id,
        customer_name: cart.customer_name,
        customer_phone: cart.customer_phone,
        total: cart.total,
        items: Array.isArray(cart.items) ? (cart.items as unknown as AbandonedCartItem[]) : JSON.parse(String(cart.items) || '[]'),
        recovery_url: cart.recovery_url,
        status: cart.status,
        abandoned_at: cart.abandoned_at,
        ecommerce_stores: cart.store_nome ? {
          nome: cart.store_nome,
          cor: cart.store_cor
        } : null,
      })).slice(0, 5) as AbandonedCart[];
    },
    enabled: !!contactPhoneSuffix && contactPhoneSuffix.length >= 8,
  });

  const handleCopyRecoveryLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const handleSaveNotes = async () => {
    try {
      await saveNotes.mutateAsync({
        conversationId: conversation.id,
        notes,
      });
      toast.success('Anotações salvas');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar anotações';
      toast.error(message);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Status labels para pedidos internos
  const statusLabels: Record<string, string> = {
    orcamento: 'Orçamento',
    confirmado: 'Confirmado',
    em_producao: 'Em Produção',
    pronto_entrega: 'Pronto',
    entregue: 'Entregue',
    cancelado: 'Cancelado',
  };

  const statusColors: Record<string, string> = {
    orcamento: 'bg-blue-100 text-blue-800',
    confirmado: 'bg-green-100 text-green-800',
    em_producao: 'bg-yellow-100 text-yellow-800',
    pronto_entrega: 'bg-purple-100 text-purple-800',
    entregue: 'bg-gray-100 text-gray-800',
    cancelado: 'bg-red-100 text-red-800',
  };

  // Status labels para pedidos e-commerce
  const ecommerceStatusLabels: Record<string, string> = {
    pending: 'Aguardando',
    processing: 'Processando',
    shipped: 'Enviado',
    delivered: 'Entregue',
    cancelled: 'Cancelado',
    payment_denied: 'Pagto Negado',
  };

  const ecommerceStatusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    shipped: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    payment_denied: 'bg-red-100 text-red-800',
  };

  const ecommerceOrdersVisible = useMemo(
    () =>
      showAllEcommerceOrders
        ? ecommerceOrders
        : ecommerceOrders.slice(0, ORDERS_INITIAL_VISIBLE),
    [ecommerceOrders, showAllEcommerceOrders]
  );
  const hasMoreEcommerceOrders = ecommerceOrders.length > ORDERS_INITIAL_VISIBLE;

  const pedidosInternosVisible = useMemo(
    () =>
      showAllInternalOrders
        ? pedidosInternos
        : pedidosInternos.slice(0, ORDERS_INITIAL_VISIBLE),
    [pedidosInternos, showAllInternalOrders]
  );
  const hasMorePedidosInternos = pedidosInternos.length > ORDERS_INITIAL_VISIBLE;

  return (
    <div className="flex flex-col h-full overflow-hidden w-full min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b flex-shrink-0">
        <h3 className="font-medium text-[#111b21]">Informações</h3>
      </div>

      <ScrollArea className="flex-1 w-full">
        <div className="p-4 space-y-4 overflow-hidden">
          {/* Contact info */}
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-20 w-20">
              <AvatarImage src={conversation.is_group ? conversation.group_photo_url || undefined : conversation.contact_photo_url || undefined} />
              <AvatarFallback className="text-xl bg-[#dfe5e7] text-[#54656f]">
                {getInitials(conversation.contact_name || conversation.contact_phone || '?')}
              </AvatarFallback>
            </Avatar>
            <h4 className="mt-2 font-medium text-[#111b21]">
              {conversation.is_group ? conversation.group_name : conversation.contact_name || 'Sem nome'}
            </h4>
            {conversation.contact_phone && (
              <p className="text-sm text-[#667781]">{conversation.contact_phone}</p>
            )}
          </div>

          {/* Abandoned Carts */}
          {abandonedCarts.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h5 className="text-sm font-medium flex items-center gap-2 text-orange-600">
                  <AlertCircle className="h-4 w-4" />
                  Carrinhos Abandonados
                </h5>
                <div className="space-y-2">
                  {abandonedCarts.map((cart) => (
                    <Collapsible 
                      key={cart.id} 
                      open={expandedCartId === cart.id}
                      onOpenChange={(open) => setExpandedCartId(open ? cart.id : null)}
                    >
                      <div className="rounded-lg bg-orange-50 border border-orange-200 overflow-hidden">
                        <CollapsibleTrigger className="w-full p-2 text-sm text-left hover:bg-orange-100 transition-colors">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <ShoppingBag className="h-4 w-4 text-orange-600" />
                              <span className="font-medium text-[#111b21]">
                                {cart.items.length} {cart.items.length === 1 ? 'item' : 'itens'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-semibold text-orange-700">
                                {formatCurrency(cart.total)}
                              </span>
                              {expandedCartId === cart.id ? (
                                <ChevronUp className="h-4 w-4 text-[#667781]" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-[#667781]" />
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-[#667781] mt-1 flex items-center gap-2">
                            <span>
                              Abandonado {formatDistanceToNow(new Date(cart.abandoned_at), { addSuffix: true, locale: ptBR })}
                            </span>
                            {cart.ecommerce_stores && (
                              <span 
                                className="px-1.5 py-0.5 rounded text-white text-[10px]"
                                style={{ backgroundColor: cart.ecommerce_stores.cor || '#6b7280' }}
                              >
                                {cart.ecommerce_stores.nome}
                              </span>
                            )}
                          </div>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <div className="px-2 pb-2 space-y-2">
                            {/* Items list */}
                            <div className="bg-white rounded p-2 text-xs space-y-1 overflow-hidden">
                              {cart.items.map((item, idx) => (
                                <div key={idx} className="text-[#111b21]">
                                  <span className="break-words">
                                    {item.quantity}x {item.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                            
                            {/* Actions */}
                            <div className="flex gap-1">
                              {cart.recovery_url && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 h-7 text-xs"
                                    onClick={() => handleCopyRecoveryLink(cart.recovery_url!)}
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copiar Link
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => window.open(cart.recovery_url!, '_blank')}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Linked client */}
          {conversation.cliente ? (
            <div className="space-y-2">
              <h5 className="text-sm font-medium flex items-center gap-2 text-[#111b21]">
                <Building2 className="h-4 w-4" />
                Cliente Vinculado
              </h5>
              <div className="p-3 rounded-lg bg-[#f0f2f5]">
                <p className="font-medium text-[#111b21]">{conversation.cliente.nome_razao_social}</p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-[#f0f2f5] text-center">
              <User className="h-8 w-8 mx-auto text-[#667781] mb-2" />
              <p className="text-sm text-[#667781]">
                Nenhum cliente vinculado
              </p>
            </div>
          )}

          {/* E-commerce orders by phone */}
          {ecommerceOrders.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h5 className="text-sm font-medium flex items-center gap-2 text-[#111b21]">
                  <ShoppingCart className="h-4 w-4" />
                  Pedidos E-commerce
                </h5>
                <div className="space-y-2">
                  {ecommerceOrdersVisible.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => setSelectedEcommerceOrderId(order.id)}
                      className="w-full p-2 rounded-lg bg-[#f0f2f5] text-sm text-left hover:bg-[#e9edef] transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-[#111b21]">#{order.order_number}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${ecommerceStatusColors[order.status] || 'bg-gray-100'}`}>
                          {ecommerceStatusLabels[order.status] || order.status}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#667781] mt-1">
                        <span>{format(new Date(order.created_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                        <span>{formatCurrency(order.total)}</span>
                      </div>
                      {order.delivery_estimate && (
                        <div className="flex items-center gap-1 text-[#667781] mt-1">
                          <Truck className="h-3 w-3" />
                          <span className="text-xs">
                            Entrega: {format(new Date(order.delivery_estimate), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        </div>
                      )}
                    </button>
                  ))}
                  {hasMoreEcommerceOrders && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowAllEcommerceOrders((prev) => !prev)}
                    >
                      {showAllEcommerceOrders ? 'Ver menos' : `Ver mais (${ecommerceOrders.length})`}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Pedidos internos */}
          {pedidosInternos.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h5 className="text-sm font-medium flex items-center gap-2 text-[#111b21]">
                  <ShoppingCart className="h-4 w-4" />
                  Pedidos Internos
                </h5>
                <div className="space-y-2">
                  {pedidosInternosVisible.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => setSelectedPedido(order)}
                      className="w-full p-2 rounded-lg bg-[#f0f2f5] text-sm text-left hover:bg-[#e9edef] transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-[#111b21]">#{order.numero_pedido}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${statusColors[order.status] || 'bg-gray-100'}`}>
                          {statusLabels[order.status] || order.status}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#667781] mt-1">
                        <span>{format(new Date(order.data_pedido), 'dd/MM/yyyy', { locale: ptBR })}</span>
                        <span>{formatCurrency(order.valor_total)}</span>
                      </div>
                    </button>
                  ))}
                  {hasMorePedidosInternos && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowAllInternalOrders((prev) => !prev)}
                    >
                      {showAllInternalOrders ? 'Ver menos' : `Ver mais (${pedidosInternos.length})`}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Internal notes */}
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-[#111b21]">Anotações Internas</h5>
            <Textarea
              placeholder="Adicione anotações sobre este atendimento..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="bg-[#f0f2f5] border-none focus-visible:ring-1"
            />
            <Button
              size="sm"
              onClick={handleSaveNotes}
              disabled={saveNotes.isPending || notes === conversation.internal_notes}
              className="w-full bg-[#25d366] hover:bg-[#1da851]"
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar Anotações
            </Button>
          </div>
        </div>
      </ScrollArea>

      {/* Pedido detail dialog */}
      <PedidoDetalheDialog
        open={!!selectedPedido}
        onOpenChange={(open) => !open && setSelectedPedido(null)}
        pedido={selectedPedido}
      />

      {/* E-commerce order detail dialog */}
      <EcommerceOrderDetailDialog
        open={!!selectedEcommerceOrderId}
        onOpenChange={(open) => !open && setSelectedEcommerceOrderId(null)}
        orderId={selectedEcommerceOrderId}
      />
    </div>
  );
}
