import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Calendar,
  CreditCard,
  DollarSign,
  Clock,
  UserCheck
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface PagamentoDetalhesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pagamento: any;
}

const formaPagamentoLabels: Record<string, string> = {
  pix: 'PIX',
  cartao: 'Cartão',
  boleto: 'Boleto',
  dinheiro: 'Dinheiro',
};

const tipoPagamentoLabels: Record<string, string> = {
  entrada: 'Entrada',
  parcial: 'Parcial',
  quitacao: 'Quitação',
  estorno: 'Estorno',
};

export function PagamentoDetalhesDialog({ 
  open, 
  onOpenChange, 
  pagamento 
}: PagamentoDetalhesDialogProps) {
  if (!pagamento) return null;

  const pedido = pagamento.pedidos;
  const cliente = pedido?.clientes;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalhes do Pagamento - Pedido #{pedido?.numero_pedido}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Pagamento */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Dados do Pagamento
            </h3>
            <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Valor</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(Number(pagamento.valor))}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Forma de Pagamento</p>
                <Badge variant="outline" className="mt-1">
                  <CreditCard className="h-3 w-3 mr-1" />
                  {formaPagamentoLabels[pagamento.forma_pagamento] || pagamento.forma_pagamento}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium">
                  {tipoPagamentoLabels[pagamento.tipo] || pagamento.tipo}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data do Pagamento</p>
                <p className="font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(pagamento.data_pagamento), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              {pagamento.data_vencimento_boleto && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Vencimento do Boleto</p>
                  <p className="font-medium flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {format(new Date(pagamento.data_vencimento_boleto + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              )}
              {pagamento.observacao && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Observação</p>
                  <p className="font-medium bg-background p-2 rounded border">
                    {pagamento.observacao}
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Quem Lançou */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Lançado Por
            </h3>
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{pagamento.criador?.nome || 'Não identificado'}</p>
                  {pagamento.criador?.email && (
                    <p className="text-sm text-muted-foreground">{pagamento.criador.email}</p>
                  )}
                </div>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Registrado em: {format(new Date(pagamento.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
            </div>
          </div>

          <Separator />

          {/* Informações do Cliente */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Dados do Cliente
            </h3>
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Nome/Razão Social</p>
                <p className="font-semibold text-lg">{cliente?.nome_razao_social || '-'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {cliente?.cpf_cnpj && (
                  <div>
                    <p className="text-sm text-muted-foreground">CPF/CNPJ</p>
                    <p className="font-medium">{cliente.cpf_cnpj}</p>
                  </div>
                )}
                
                {(cliente?.telefone || cliente?.whatsapp) && (
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone/WhatsApp</p>
                    <p className="font-medium flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {cliente.whatsapp || cliente.telefone}
                    </p>
                  </div>
                )}
                
                {cliente?.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {cliente.email}
                    </p>
                  </div>
                )}
              </div>

              {cliente?.endereco && (
                <div>
                  <p className="text-sm text-muted-foreground">Endereço</p>
                  <p className="font-medium flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {cliente.endereco}
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Informações do Pedido */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Dados do Pedido
            </h3>
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Número do Pedido</p>
                  <p className="font-bold text-lg">#{pedido?.numero_pedido}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total do Pedido</p>
                  <p className="font-bold text-lg">{formatCurrency(Number(pedido?.valor_total || 0))}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data do Pedido</p>
                  <p className="font-medium">
                    {pedido?.data_pedido 
                      ? format(new Date(pedido.data_pedido), "dd/MM/yyyy", { locale: ptBR })
                      : '-'
                    }
                  </p>
                </div>
                {pedido?.data_entrega && (
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Entrega</p>
                    <p className="font-medium">
                      {format(new Date(pedido.data_entrega), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Vendedor</p>
                  <p className="font-medium">{pedido?.vendedor?.nome || '-'}</p>
                </div>
              </div>

              {pedido?.observacao && (
                <div>
                  <p className="text-sm text-muted-foreground">Observação do Pedido</p>
                  <p className="font-medium bg-background p-2 rounded border text-sm">
                    {pedido.observacao}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}