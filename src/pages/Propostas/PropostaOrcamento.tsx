import { useParams, useNavigate } from 'react-router-dom';
import { useProposta } from '@/hooks/usePropostas';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Printer } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logo from '@/assets/logotipo_horizontal_colorido.png';
import { formatCurrency, calcularDesconto, parseDateString } from '@/lib/formatters';

export default function PropostaOrcamento() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: proposta, isLoading } = useProposta(id);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Carregando orçamento...</p>
      </div>
    );
  }

  if (!proposta) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Proposta não encontrada</p>
      </div>
    );
  }

  type ItemOrcamento = {
    id: string;
    quantidade: number;
    valor_unitario: string;
    observacoes?: string | null;
    nome_customizado?: string | null;
    valor_base_customizado?: string | null;
    produto?: {
      nome?: string | null;
      valor_base?: string | null;
    } | null;
  };

  const itens = (proposta.itens || []) as ItemOrcamento[];
  const propostaComDesconto = proposta as {
    desconto_percentual?: number | null;
  };

  const resumoItens = itens.reduce((acc: {
    subtotal: number;
    valorOriginal: number;
    economiaItens: number;
    temDescontoItens: boolean;
  }, item) => {
    const quantidade = Number(item.quantidade || 0);
    const valorUnitario = Number.parseFloat(item.valor_unitario || '0');
    const valorBaseProduto = item.valor_base_customizado 
      ? Number.parseFloat(item.valor_base_customizado)
      : (item.produto?.valor_base ? Number.parseFloat(item.produto.valor_base) : null);
    const valorBaseAjustado = valorBaseProduto && valorUnitario > valorBaseProduto ? valorUnitario : valorBaseProduto;
    const descontoItem = valorBaseAjustado ? calcularDesconto(valorBaseAjustado, valorUnitario) : null;

    return {
      subtotal: acc.subtotal + (quantidade * valorUnitario),
      valorOriginal: acc.valorOriginal + (quantidade * (valorBaseAjustado || valorUnitario)),
      economiaItens: acc.economiaItens + (descontoItem ? (descontoItem.valorEconomizado * quantidade) : 0),
      temDescontoItens: acc.temDescontoItens || Boolean(descontoItem),
    };
  }, {
    subtotal: 0,
    valorOriginal: 0,
    economiaItens: 0,
    temDescontoItens: false,
  });

  const subtotal = resumoItens.subtotal;
  const valorOriginalItens = resumoItens.valorOriginal;
  const valorEconomiaItens = resumoItens.economiaItens;
  const temDescontoItens = resumoItens.temDescontoItens;
  const descontoPercentual = Number(propostaComDesconto.desconto_percentual || 0);
  const valorDesconto = subtotal * (descontoPercentual / 100);
  const valorTotal = subtotal - valorDesconto;
  const temDescontoGeral = descontoPercentual > 0;
  const temQualquerDesconto = temDescontoGeral || temDescontoItens;
  const valorEconomiaTotal = valorEconomiaItens + valorDesconto;

  // Usar a data da proposta (created_at) para calcular validade
  const dataProposta = proposta.created_at 
    ? parseDateString(proposta.created_at.split('T')[0])
    : new Date();
  const dataValidade = addDays(dataProposta, 10);

  const temObservacoes = itens.some((item) => item.observacoes);

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0.5cm;
          }
          
          /* Hide browser header/footer with URL */
          html {
            margin: 0;
            padding: 0;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            font-size: 11px !important;
          }
          
          .print-grid-2 {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 0.5rem !important;
          }
          
          .print-compact > * + * {
            margin-top: 0.25rem !important;
          }
          
          .print-box {
            padding: 0.35rem !important;
            border: 1px solid #e5e7eb !important;
            background: transparent !important;
          }
          
          table td, table th {
            padding: 0.15rem 0.35rem !important;
            font-size: 10px !important;
            line-height: 1.15 !important;
          }
          
          .print\\:text-\\[9px\\] {
            font-size: 9px !important;
          }
          
          .print\\:text-\\[10px\\] {
            font-size: 10px !important;
          }
          
          .print\\:text-\\[11px\\] {
            font-size: 11px !important;
          }
          
          .print\\:h-8 {
            height: 2rem !important;
          }
          
          .print\\:gap-2 {
            gap: 0.5rem !important;
          }
          
          .print\\:p-1 {
            padding: 0.25rem !important;
          }
          
          .print\\:my-0 {
            margin-top: 0 !important;
            margin-bottom: 0 !important;
          }
          
          .print\\:space-y-0 > * + * {
            margin-top: 0.125rem !important;
          }
          
          .print\\:leading-tight {
            line-height: 1.15 !important;
          }
          
          .bg-muted\\/30, .bg-muted\\/50, .bg-primary\\/5 {
            background: transparent !important;
            border: 1px solid #e5e7eb !important;
            padding: 0.35rem !important;
          }
          
          .print\\:break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          
          .badge {
            font-size: 8px !important;
            padding: 0.1rem 0.25rem !important;
          }
          
          .print\\:max-h-32 {
            max-height: 8rem !important;
          }
        }
      `}</style>
      
      <div className="min-h-screen bg-background">
        {/* Action Buttons - Hidden on print */}
        <div className="print:hidden sticky top-0 z-10 bg-background border-b px-6 py-4">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => navigate(`/propostas/${id}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir / PDF
            </Button>
          </div>
        </div>

        {/* Orçamento Content */}
        <div className="max-w-5xl mx-auto p-8 print:p-0">
          <Card className="print:shadow-none print:border-0">
            <CardContent className="p-8 print:p-2 space-y-6 print:space-y-0 print-compact">
            {/* Header with Logo */}
            <div className="text-center space-y-2 print:space-y-0 print:mb-1">
              <img 
                src={logo} 
                alt="Gatha Comércio de Vestuários" 
                className="h-16 print:h-8 mx-auto object-contain"
              />
              <h1 className="text-2xl print:text-[11px] font-bold text-foreground print:my-0">PROPOSTA COMERCIAL</h1>
            </div>

            {/* Empresa + Vendedor + Proposta + Cliente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-4 print:gap-2 print-grid-2 print:break-inside-avoid">
              <div className="bg-muted/30 rounded-lg p-4 print:p-1 space-y-2 print:space-y-0 print-box">
                <h2 className="text-base print:text-[10px] font-bold text-foreground print:mb-0 print:leading-tight">Empresa</h2>
                <p className="text-sm print:text-[9px] print:leading-tight">
                  <span className="font-semibold">Razão:</span> Gatha Comércio de Vestuários Ltda
                </p>
                <p className="text-sm print:text-[9px] print:leading-tight">
                  <span className="font-semibold">CNPJ:</span> 22.414.170/0001-55
                </p>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 print:p-1 space-y-2 print:space-y-0 print-box">
                <h2 className="text-base print:text-[10px] font-bold text-foreground print:mb-0 print:leading-tight">Vendedor</h2>
                <p className="text-sm print:text-[9px] print:leading-tight">
                  <span className="font-semibold">Nome:</span> {proposta.vendedor?.nome || 'N/A'}
                </p>
                <p className="text-sm print:text-[9px] print:leading-tight">
                  <span className="font-semibold">Email:</span> {proposta.vendedor?.email || 'N/A'}
                </p>
                {proposta.vendedor?.whatsapp && (
                  <p className="text-sm print:text-[9px] print:leading-tight">
                    <span className="font-semibold">WhatsApp:</span> {proposta.vendedor.whatsapp}
                  </p>
                )}
              </div>

              <div className="bg-muted/30 rounded-lg p-4 print:p-1 space-y-2 print:space-y-0 print-box">
                <h2 className="text-base print:text-[10px] font-bold text-foreground print:mb-0 print:leading-tight">Proposta</h2>
                <p className="text-sm print:text-[9px] print:leading-tight">
                  <span className="font-semibold">Data:</span>{' '}
                  {format(dataProposta, 'dd/MM/yyyy', { locale: ptBR })}
                </p>
                <p className="text-sm print:text-[9px] print:leading-tight">
                  <span className="font-semibold">Ref:</span> #{proposta.id.slice(0, 8).toUpperCase()}
                </p>
                <p className="text-sm print:text-[9px] print:leading-tight">
                  <span className="font-semibold">Validade:</span>{' '}
                  {format(dataValidade, 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 print:p-1 space-y-2 print:space-y-0 print-box">
                <h2 className="text-base print:text-[10px] font-bold text-foreground print:mb-0 print:leading-tight">Cliente</h2>
                <p className="text-sm print:text-[9px] print:leading-tight">
                  <span className="font-semibold">Nome:</span>{' '}
                  {proposta.cliente?.nome_razao_social || 'N/A'}
                </p>
                {proposta.cliente?.cpf_cnpj && (
                  <p className="text-sm print:text-[9px] print:leading-tight">
                    <span className="font-semibold">CPF/CNPJ:</span> {proposta.cliente.cpf_cnpj}
                  </p>
                )}
                {proposta.cliente?.telefone && (
                  <p className="text-sm print:text-[9px] print:leading-tight">
                    <span className="font-semibold">Tel:</span> {proposta.cliente.telefone}
                  </p>
                )}
              </div>
            </div>

            {/* Tabela de Produtos */}
            <div className="space-y-4 print:space-y-0 print:mt-2 print:break-inside-avoid">
              <h2 className="text-lg print:text-[10px] font-bold text-foreground print:mb-1">Detalhamento dos Produtos</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border border-border p-3 print:p-1 text-left text-sm print:text-[9px] font-semibold">
                        Produto
                      </th>
                      <th className="border border-border p-3 print:p-1 text-center text-sm print:text-[9px] font-semibold">
                        Qtd
                      </th>
                      <th className="border border-border p-3 print:p-1 text-right text-sm print:text-[9px] font-semibold">
                        Unit.
                      </th>
                      <th className="border border-border p-3 print:p-1 text-right text-sm print:text-[9px] font-semibold">
                        {temQualquerDesconto ? 'Unit. c/ Desc' : 'Unit. Venda'}
                      </th>
                      {temObservacoes && (
                        <th className="border border-border p-3 print:p-1 text-left text-sm print:text-[9px] font-semibold">
                          Obs
                        </th>
                      )}
                      <th className="border border-border p-3 print:p-1 text-right text-sm print:text-[9px] font-semibold">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item) => {
                      const valorTotalItem = item.quantidade * parseFloat(item.valor_unitario);
                      const valorUnitario = parseFloat(item.valor_unitario);
                      const valorBaseProduto = item.valor_base_customizado
                        ? parseFloat(item.valor_base_customizado)
                        : (item.produto?.valor_base ? parseFloat(item.produto.valor_base) : null);
                      const valorBase = valorBaseProduto && valorUnitario > valorBaseProduto ? valorUnitario : valorBaseProduto;
                      const desconto = valorBase ? calcularDesconto(valorBase, valorUnitario) : null;
                      
                      return (
                        <tr key={item.id}>
                          <td className="border border-border p-3 print:p-1 text-sm print:text-[9px]">
                            {item.nome_customizado || item.produto?.nome || 'N/A'}
                          </td>
                          <td className="border border-border p-3 print:p-1 text-center text-sm print:text-[9px]">
                            {item.quantidade}
                          </td>
                          <td className="border border-border p-3 print:p-1 text-right text-sm print:text-[9px] text-muted-foreground">
                            {valorBase ? formatCurrency(valorBase) : '-'}
                          </td>
                          <td className="border border-border p-3 print:p-1 text-right text-sm print:text-[9px]">
                            {desconto ? (
                              <div className="flex flex-col print:flex-row items-end print:items-center gap-1 print:gap-0">
                                <span className="font-semibold text-green-600">
                                  {formatCurrency(valorUnitario)}
                                </span>
                                <Badge className="bg-green-600 text-white text-xs print:text-[8px] print:ml-1 print:hidden">
                                  {desconto.percentual}% OFF
                                </Badge>
                                <span className="hidden print:inline text-[8px] font-semibold text-green-700 print:ml-1">
                                  {desconto.percentual}% OFF
                                </span>
                              </div>
                            ) : (
                              <span>{formatCurrency(valorUnitario)}</span>
                            )}
                          </td>
                          {temObservacoes && (
                            <td className="border border-border p-3 print:p-1 text-sm print:text-[9px] text-muted-foreground">
                              {item.observacoes || '-'}
                            </td>
                          )}
                          <td className="border border-border p-3 print:p-1 text-right text-sm print:text-[9px] font-semibold">
                            {formatCurrency(valorTotalItem)}
                          </td>
                        </tr>
                      );
                    })}
                    {temQualquerDesconto && (
                      <tr className="bg-muted/30">
                        <td colSpan={temObservacoes ? 5 : 4} className="border border-border p-2 print:p-1 text-right text-xs print:text-[8px] text-muted-foreground">
                          Economia total em descontos
                        </td>
                        <td className="border border-border p-2 print:p-1 text-right text-xs print:text-[8px] text-muted-foreground">
                          -{formatCurrency(valorEconomiaTotal)}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-muted/50">
                      <td colSpan={temObservacoes ? 5 : 4} className="border border-border p-3 print:p-1 text-right text-sm print:text-[9px] font-bold">
                        VALOR TOTAL
                      </td>
                      <td className="border border-border p-3 print:p-1 text-right text-lg print:text-[11px] font-bold text-primary">
                        {formatCurrency(valorTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Condições de Pagamento + Observações */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-2 print:mt-2">
              <div className="bg-primary/5 rounded-lg p-6 print:p-1 space-y-3 print:space-y-0 border-l-4 print:border-l-2 border-primary print-box">
                <h2 className="text-lg print:text-[10px] font-bold text-foreground print:mb-0">Condições de Pagamento</h2>
                <div className="space-y-3 print:space-y-0 text-sm print:text-[9px] print:leading-tight">
                  <p><span className="font-semibold">Pix:</span> Entrada 40%, restante na retirada</p>
                  <p><span className="font-semibold">Cartão:</span> Até 3x sem juros</p>
                  <p><span className="font-semibold">Boleto:</span> À vista 30 dias ou 2x</p>
                </div>
              </div>

              {proposta.observacoes ? (
                <div className="space-y-2 print:space-y-0 print-box print:p-1">
                  <h2 className="text-lg print:text-[10px] font-bold text-foreground print:mb-0">Observações</h2>
                  <p className="text-sm print:text-[9px] text-muted-foreground whitespace-pre-wrap print:leading-tight">
                    {proposta.observacoes}
                  </p>
                </div>
              ) : <div />}
            </div>

            {/* Imagem de Referência */}
            {proposta.imagem_referencia_url && (
              <div className="space-y-2 print:space-y-0 print:mt-2 print:break-inside-avoid">
                <h2 className="text-lg print:text-[10px] font-bold text-foreground print:mb-1">Imagem de Referência</h2>
                <div className="flex justify-center">
                  <img 
                    src={proposta.imagem_referencia_url} 
                    alt="Imagem de referência" 
                    className="max-w-md w-full h-auto rounded-lg border border-border object-contain print:max-h-32 print:w-auto"
                  />
                </div>
              </div>
            )}

            {/* Rodapé */}
            <div className="pt-6 print:pt-1 print:mt-1 border-t">
              <p className="text-center text-xs print:text-[8px] text-muted-foreground">
                Proposta válida por 10 dias a partir da data de emissão
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}
