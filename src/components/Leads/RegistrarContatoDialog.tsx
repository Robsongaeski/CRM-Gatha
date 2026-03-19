import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useRegistrarInteracao } from '@/hooks/useLeadsInteracoes';
import { Phone, MessageSquare, Mail, Users, MoreHorizontal } from 'lucide-react';

const contatoSchema = z.object({
  tipo: z.enum(['ligacao', 'whatsapp', 'email', 'reuniao', 'outro']),
  resultado: z.enum(['sem_resposta', 'retornar', 'interessado', 'nao_interessado', 'agendado', 'convertido']).optional(),
  descricao: z.string().min(5, 'Descreva o contato com mais detalhes'),
  proxima_acao: z.string().optional(),
  data_proxima_acao: z.string().optional(),
  atualizar_data_retorno: z.boolean().optional(),
  data_retorno_lead: z.string().optional(), // Apenas data, sem hora
});

type ContatoFormData = z.infer<typeof contatoSchema>;

interface RegistrarContatoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
}

const tipoIcons = {
  ligacao: Phone,
  whatsapp: MessageSquare,
  email: Mail,
  reuniao: Users,
  outro: MoreHorizontal,
};

export function RegistrarContatoDialog({ open, onOpenChange, leadId }: RegistrarContatoDialogProps) {
  const registrarMutation = useRegistrarInteracao();

  const form = useForm<ContatoFormData>({
    resolver: zodResolver(contatoSchema),
    defaultValues: {
      tipo: 'ligacao',
      descricao: '',
      atualizar_data_retorno: false,
    },
  });

  const onSubmit = async (data: ContatoFormData) => {
    await registrarMutation.mutateAsync({
      lead_id: leadId,
      tipo: data.tipo,
      resultado: data.resultado,
      descricao: data.descricao,
      proxima_acao: data.proxima_acao,
      data_proxima_acao: data.data_proxima_acao,
      atualizar_data_retorno: data.atualizar_data_retorno,
      data_retorno_lead: data.data_retorno_lead,
    });

    form.reset();
    onOpenChange(false);
  };

  const atualizarDataRetorno = form.watch('atualizar_data_retorno');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Contato com Lead</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Contato *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ligacao">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Ligação Telefônica
                        </div>
                      </SelectItem>
                      <SelectItem value="whatsapp">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          WhatsApp
                        </div>
                      </SelectItem>
                      <SelectItem value="email">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          E-mail
                        </div>
                      </SelectItem>
                      <SelectItem value="reuniao">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Reunião
                        </div>
                      </SelectItem>
                      <SelectItem value="outro">
                        <div className="flex items-center gap-2">
                          <MoreHorizontal className="h-4 w-4" />
                          Outro
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="resultado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resultado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o resultado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sem_resposta">Sem resposta / Não atendeu</SelectItem>
                      <SelectItem value="retornar">Pediu para retornar depois</SelectItem>
                      <SelectItem value="interessado">Demonstrou interesse</SelectItem>
                      <SelectItem value="nao_interessado">Não tem interesse</SelectItem>
                      <SelectItem value="agendado">Agendou próximo contato</SelectItem>
                      <SelectItem value="convertido">Fechou negócio</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição do Contato *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Descreva o que foi conversado, principais pontos discutidos..."
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="proxima_acao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Próxima Ação (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Ex: Enviar orçamento por e-mail, ligar novamente..."
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="atualizar_data_retorno"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">
                      Definir/Atualizar data de retorno do lead
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {atualizarDataRetorno && (
              <FormField
                control={form.control}
                name="data_retorno_lead"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data do Retorno *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={registrarMutation.isPending}>
                {registrarMutation.isPending ? 'Salvando...' : 'Registrar Contato'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
