import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquarePlus, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/errorHandling';

interface IniciarConversaDialogProps {
  instances: Array<{ id: string; nome: string }>;
  onConversationOpened?: (conversationId: string, instanceId: string) => void;
}

export default function IniciarConversaDialog({ 
  instances, 
  onConversationOpened 
}: IniciarConversaDialogProps) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [instanceId, setInstanceId] = useState(instances[0]?.id || '');
  const [loading, setLoading] = useState(false);

  // Atualiza instância padrão quando lista muda
  useEffect(() => {
    if (instances.length > 0 && !instanceId) {
      setInstanceId(instances[0].id);
    }
  }, [instances, instanceId]);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const limited = numbers.slice(0, 11);
    
    if (limited.length <= 2) return limited;
    if (limited.length <= 7) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTelefone(formatPhone(e.target.value));
  };

  const normalizePhone = (phone: string) => {
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length >= 10 && numbers.length <= 11 && !numbers.startsWith('55')) {
      return '55' + numbers;
    }
    return numbers;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const phoneNumbers = telefone.replace(/\D/g, '');
    if (phoneNumbers.length < 10) {
      toast.error('Telefone inválido', { description: 'Digite um telefone com DDD' });
      return;
    }

    if (!instanceId) {
      toast.error('Selecione uma instância');
      return;
    }

    setLoading(true);

    try {
      const normalizedPhone = normalizePhone(telefone);
      const contactName = nome.trim() || normalizedPhone;
      const remoteJid = `${normalizedPhone}@s.whatsapp.net`;
      const legacyRemoteJid = `${normalizedPhone}@c.us`;

      // Buscar conversa existente pelo telefone normalizado (em QUALQUER instância)
      // Prioriza instâncias que o usuário tem acesso
      const instanceIds = instances.map(i => i.id);
      
      const { data: existingConversations } = await supabase
        .from('whatsapp_conversations')
        .select('id, instance_id, contact_phone, remote_jid')
        .or(`contact_phone.eq.${normalizedPhone},remote_jid.eq.${remoteJid},remote_jid.eq.${legacyRemoteJid}`)
        .in('instance_id', instanceIds)
        .order('updated_at', { ascending: false });

      if (existingConversations && existingConversations.length > 0) {
        // Prioriza conversa na instância selecionada, senão pega a mais recente
        const existingConv = existingConversations.find(c => c.instance_id === instanceId) 
          || existingConversations[0];
        
        toast.info('Abrindo conversa existente', { 
          description: 'Já existe uma conversa com este número' 
        });
        
        setOpen(false);
        setNome('');
        setTelefone('');
        
        onConversationOpened?.(existingConv.id, existingConv.instance_id);
        return;
      }

      // Criar nova conversa apenas se não existir
      const { data: newConv, error } = await supabase
        .from('whatsapp_conversations')
        .insert({
          instance_id: instanceId,
          remote_jid: remoteJid,
          contact_name: contactName,
          contact_phone: normalizedPhone,
          status: 'pending',
          unread_count: 0,
        })
        .select('id, instance_id')
        .single();

      if (error) throw error;

      toast.success('Conversa iniciada!', { description: `Conversa com ${contactName} criada` });
      
      setNome('');
      setTelefone('');
      setOpen(false);
      
      if (newConv) {
        onConversationOpened?.(newConv.id, newConv.instance_id);
      }
    } catch (error: any) {
      console.error('Erro ao iniciar conversa:', error);
      toast.error('Erro ao iniciar conversa', { description: sanitizeError(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-[#f0f2f5] hover:bg-[#e9edef] flex-shrink-0"
            >
              <MessageSquarePlus className="h-4 w-4 text-[#54656f]" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Nova conversa</TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Iniciar Nova Conversa</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone *</Label>
            <Input
              id="telefone"
              placeholder="(00) 00000-0000"
              value={telefone}
              onChange={handlePhoneChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome">Nome (opcional)</Label>
            <Input
              id="nome"
              placeholder="Nome do contato"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Instância *</Label>
            <Select value={instanceId} onValueChange={setInstanceId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a instância" />
              </SelectTrigger>
              <SelectContent>
                {instances.map((inst) => (
                  <SelectItem key={inst.id} value={inst.id}>
                    {inst.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Iniciar Conversa
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
