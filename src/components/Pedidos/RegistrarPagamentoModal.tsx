import { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Upload, AlertTriangle } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useCreatePagamento, useUploadComprovante, usePagamentos } from '@/hooks/usePagamentos';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatters';

const createPagamentoSchema = (valorRestante: number) => z.object({
  tipo: z.enum(['entrada', 'parcial', 'quitacao']),
  valor: z.number()
    .min(0.01, 'Valor deve ser maior que zero')
    .refine(
      (val) => val <= valorRestante + 0.01,
      { message: `Valor não pode ser maior que ${formatCurrency(valorRestante)}` }
    ),
  forma_pagamento: z.enum(['pix', 'cartao', 'boleto', 'dinheiro']),
  data_pagamento: z.string(),
  numero_parcelas: z.number().min(1).max(12).optional(),
  observacao: z.string().optional(),
});

interface RegistrarPagamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId: string;
  valorRestante: number;
  statusPedido: string;
  requerAprovacao: boolean;
}

export function RegistrarPagamentoModal({ 
  open, 
  onOpenChange, 
  pedidoId, 
  valorRestante, 
  statusPedido, 
  requerAprovacao 
}: RegistrarPagamentoModalProps) {
  const { can } = usePermissions();
  const podeRegistrarPagamento = can('pagamentos.registrar');
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [vencimentosParcelas, setVencimentosParcelas] = useState<string[]>([]);
  const createPagamento = useCreatePagamento();
  const uploadComprovante = useUploadComprovante();
  const { data: pagamentos = [] } = usePagamentos(pedidoId);

  const statusLabels = {
    aguardando: 'Aguardando',
    aprovado: 'Aprovado',
    rejeitado: 'Rejeitado',
  };

  const formaPagamentoLabels = {
    pix: 'PIX',
    cartao: 'Cartão',
    boleto: 'Boleto',
    dinheiro: 'Dinheiro',
  };

  const pagamentoSchema = createPagamentoSchema(valorRestante);

  const form = useForm<z.infer<typeof pagamentoSchema>>({
    resolver: zodResolver(pagamentoSchema),
    defaultValues: {
      tipo: 'parcial',
      valor: 0,
      forma_pagamento: 'pix',
      data_pagamento: format(new Date(), 'yyyy-MM-dd'),
      numero_parcelas: 1,
      observacao: '',
    },
  });

  const formaPagamento = useWatch({
    control: form.control,
    name: 'forma_pagamento',
  });

  const numeroParcelas = useWatch({
    control: form.control,
    name: 'numero_parcelas',
  });

  const valorTotal = useWatch({
    control: form.control,
    name: 'valor',
  });

  // Initialize vencimentos when numero_parcelas changes
  useEffect(() => {
    if (formaPagamento === 'boleto' && numeroParcelas) {
      const today = new Date();
      const newVencimentos = Array.from({ length: numeroParcelas }, (_, i) => {
        const date = addMonths(today, i);
        return format(date, 'yyyy-MM-dd');
      });
      setVencimentosParcelas(newVencimentos);
    }
  }, [numeroParcelas, formaPagamento]);

  const handleVencimentoChange = (index: number, value: string) => {
    const newVencimentos = [...vencimentosParcelas];
    newVencimentos[index] = value;
    setVencimentosParcelas(newVencimentos);
  };

  const onSubmit = async (data: z.infer<typeof pagamentoSchema>) => {
    try {
      let comprovanteUrl: string | undefined;

      if (comprovanteFile) {
        comprovanteUrl = await uploadComprovante.mutateAsync({
          file: comprovanteFile,
          pedidoId,
        });
      }

      if (data.forma_pagamento === 'boleto' && numeroParcelas && numeroParcelas > 0) {
        // Validate all vencimentos are filled
        const emptyVencimentos = vencimentosParcelas.slice(0, numeroParcelas).filter(v => !v);
        if (emptyVencimentos.length > 0) {
          toast.error('Preencha todas as datas de vencimento das parcelas');
          return;
        }

        // Create one payment for each installment
        const valorParcela = Math.round((data.valor / numeroParcelas) * 100) / 100;
        const resto = Math.round((data.valor - (valorParcela * numeroParcelas)) * 100) / 100;

        for (let i = 0; i < numeroParcelas; i++) {
          // Add remainder to last installment
          const valorFinal = i === numeroParcelas - 1 ? valorParcela + resto : valorParcela;
          
          await createPagamento.mutateAsync({
            pedido_id: pedidoId,
            tipo: data.tipo,
            valor: valorFinal,
            forma_pagamento: data.forma_pagamento,
            data_pagamento: new Date(vencimentosParcelas[i] + 'T12:00:00').toISOString(),
            data_vencimento_boleto: vencimentosParcelas[i],
            comprovante_url: i === 0 ? comprovanteUrl : undefined,
            observacao: numeroParcelas > 1 
              ? `Parcela ${i + 1}/${numeroParcelas}${data.observacao ? ` - ${data.observacao}` : ''}`
              : data.observacao,
          });
        }

        toast.success(`${numeroParcelas} parcela(s) de boleto registrada(s) com sucesso`);
      } else {
        // Non-boleto payments
        await createPagamento.mutateAsync({
          pedido_id: pedidoId,
          tipo: data.tipo,
          valor: data.valor,
          forma_pagamento: data.forma_pagamento,
          data_pagamento: new Date(data.data_pagamento + 'T12:00:00').toISOString(),
          comprovante_url: comprovanteUrl,
          observacao: data.observacao,
        });
      }

      form.reset();
      setComprovanteFile(null);
      setVencimentosParcelas([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const maxSize = 5 * 1024 * 1024;

      if (file.size > maxSize) {
        toast.error('Arquivo muito grande. Tamanho máximo: 5MB');
        return;
      }

      setComprovanteFile(file);
      toast.success('Comprovante selecionado');
    }
  };

  if (!podeRegistrarPagamento) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Acesso Negado
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground py-4">
            Você não tem permissão para registrar pagamentos.
          </p>
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Fechar
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  if (statusPedido === 'cancelado' || requerAprovacao) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pagamento Bloqueado</DialogTitle>
          </DialogHeader>
          <div className="p-6 text-center space-y-4">
            {statusPedido === 'cancelado' ? (
              <p className="text-muted-foreground">
                ⛔ Não é possível registrar pagamentos em pedidos cancelados.
              </p>
            ) : (
              <p className="text-muted-foreground">
                ⏳ Este pedido aguarda aprovação de preço. Pagamentos bloqueados até a aprovação.
              </p>
            )}
            <Button 
              onClick={() => onOpenChange(false)} 
              className="w-full"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const valorPorParcela = numeroParcelas && valorTotal > 0 
    ? Math.round((valorTotal / numeroParcelas) * 100) / 100 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Registrar Pagamento</DialogTitle>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {pagamentos.filter((p: any) => p.status === 'aguardando').length > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 font-medium mb-1">
                ⚠️ Atenção: Existem pagamentos aguardando aprovação
              </p>
              <p className="text-xs text-yellow-700">
                Há R$ {formatCurrency(
                  pagamentos
                    .filter((p: any) => p.status === 'aguardando')
                    .reduce((sum: number, p: any) => sum + Number(p.valor), 0)
                )} em pagamentos pendentes de aprovação. O saldo disponível já considera estes valores.
              </p>
            </div>
          )}

            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Pagamento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada/Sinal</SelectItem>
                      <SelectItem value="parcial">Pagamento Parcial</SelectItem>
                      <SelectItem value="quitacao">Quitação</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="valor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Total</FormLabel>
                  <FormControl>
                    <CurrencyInput
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <p className="text-sm text-muted-foreground">
                    Saldo restante: {formatCurrency(valorRestante)}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="forma_pagamento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma de Pagamento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="cartao">Cartão</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Data do Pagamento - only for non-boleto */}
            {formaPagamento !== 'boleto' && (
              <FormField
                control={form.control}
                name="data_pagamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data do Pagamento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Boleto fields */}
            {formaPagamento === 'boleto' && (
              <>
                <FormField
                  control={form.control}
                  name="numero_parcelas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Parcelas</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                            <SelectItem key={n} value={n.toString()}>
                              {n}x {valorTotal > 0 && `(${formatCurrency(valorTotal / n)} cada)`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {numeroParcelas && numeroParcelas > 0 && (
                  <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">Vencimento das Parcelas</p>
                    {Array.from({ length: numeroParcelas }, (_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground w-20">
                          Parcela {i + 1}:
                        </span>
                        <Input
                          type="date"
                          value={vencimentosParcelas[i] || ''}
                          onChange={(e) => handleVencimentoChange(i, e.target.value)}
                          className="flex-1"
                        />
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(
                            i === numeroParcelas - 1 
                              ? valorPorParcela + (valorTotal - valorPorParcela * numeroParcelas) 
                              : valorPorParcela
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Comprovante (opcional)</label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="comprovante-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('comprovante-upload')?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {comprovanteFile ? comprovanteFile.name : 'Selecionar arquivo'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Formatos aceitos: imagens e PDF. Tamanho máximo: 5MB
              </p>
            </div>

            <FormField
              control={form.control}
              name="observacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observação (opcional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Adicione observações sobre o pagamento" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {pagamentos.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Histórico de Pagamentos</h4>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {pagamentos.map((pagamento: any) => (
                      <div key={pagamento.id} className="p-3 border rounded-lg space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant={
                              pagamento.status === 'aprovado'
                                ? 'default'
                                : pagamento.status === 'rejeitado'
                                ? 'destructive'
                                : 'secondary'
                            }
                            className="text-xs"
                          >
                            {statusLabels[pagamento.status as keyof typeof statusLabels]}
                          </Badge>
                          {pagamento.estornado && (
                            <Badge variant="destructive" className="text-xs">
                              Estornado
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {formaPagamentoLabels[pagamento.forma_pagamento as keyof typeof formaPagamentoLabels]}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(pagamento.data_pagamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                            {pagamento.data_vencimento_boleto && (
                              <p className="text-xs text-muted-foreground">
                                Vencimento: {format(new Date(pagamento.data_vencimento_boleto + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            )}
                            {pagamento.criador && (
                              <p className="text-xs text-muted-foreground">
                                Por: {pagamento.criador.nome}
                              </p>
                            )}
                            {pagamento.observacao && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {pagamento.observacao}
                              </p>
                            )}
                          </div>
                          <p className="text-sm font-bold">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(Number(pagamento.valor))}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createPagamento.isPending || uploadComprovante.isPending}>
                {createPagamento.isPending || uploadComprovante.isPending ? 'Registrando...' : 'Registrar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
