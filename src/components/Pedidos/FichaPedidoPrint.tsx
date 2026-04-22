import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from 'lucide-react';
import { parseDateString } from '@/lib/formatters';
import { parsePedidoObservacoes } from '@/lib/pedidoObservacoes';

interface FichaPedidoPrintProps {
  pedido: any;
  pagamentos: any[];
}

export function FichaPedidoPrint({ pedido, pagamentos }: FichaPedidoPrintProps) {
  const valorTotal = Number(pedido.valor_total);
  const valorPago = pagamentos
    .filter((p: any) => p.status === 'aprovado' && !p.estornado)
    .reduce((sum: number, p: any) => sum + Number(p.valor), 0);
  const valorPendente = Math.round((valorTotal - valorPago) * 100) / 100;
  const temImagemAprovada = Boolean(pedido.imagem_aprovada && pedido.imagem_aprovacao_url);
  const dataEntrega = parseDateString(pedido.data_entrega);
  const dataEntregaProducao = dataEntrega ? format(dataEntrega, 'dd/MM') : 'XX/XX';
  const diaSemanaEntrega = dataEntrega
    ? format(dataEntrega, 'EEEE', { locale: ptBR })
    : 'dia da semana da entrega';
  const diaSemanaEntregaCapitalizado =
    diaSemanaEntrega.charAt(0).toUpperCase() + diaSemanaEntrega.slice(1);
  const quantidadeTotalPecas =
    pedido.itens?.reduce((sum: number, item: any) => sum + (Number(item.quantidade) || 0), 0) || 0;
  const imagemPrincipalProducao =
    pedido.imagem_aprovacao_url ||
    pedido.itens?.find((item: any) => item.foto_modelo_url)?.foto_modelo_url ||
    null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatObservacaoData = (dateValue: string | null) => {
    if (!dateValue) return null;
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return null;
    return format(parsed, 'dd/MM/yyyy HH:mm');
  };

  return (
    <div className="ficha-pedido bg-white text-black p-4 max-w-[210mm] mx-auto text-[12px]">
      <style>{`
        .obs-image-grid {
          display: grid;
          grid-template-columns: 1.6fr 1fr;
          align-items: start;
        }
        @media (max-width: 900px) {
          .obs-image-grid {
            grid-template-columns: 1fr;
          }
        }
        @media print {
          @page { 
            size: A4;
            margin: 8mm;
          }
          .obs-image-grid {
            grid-template-columns: 1.6fr 1fr !important;
          }
          body { 
            margin: 0;
            padding: 0;
          }
          .no-print { 
            display: none !important; 
          }
          .ficha-pedido {
            margin: 0;
            padding: 6mm;
            box-shadow: none !important;
            font-size: 11px;
          }
          .page-break { 
            page-break-inside: avoid; 
          }
          .item-block {
            margin-bottom: 2mm !important;
            padding-bottom: 2mm !important;
            break-inside: auto;
            page-break-inside: auto;
          }
          .item-header {
            margin-bottom: 1.5mm !important;
            padding: 1mm 1.5mm !important;
          }
          .item-body {
            gap: 2mm !important;
          }
          .item-model-image {
            width: 46mm !important;
            height: 46mm !important;
          }
          .grade-box {
            padding: 1.2mm !important;
            border-width: 1px !important;
          }
          .grade-chips {
            display: none !important;
          }
          .grade-inline-print {
            display: block !important;
            margin-top: 1mm;
            font-size: 10px;
            line-height: 1.2;
            color: #111827;
            font-weight: 600;
            word-break: break-word;
          }
          .item-divider {
            border-bottom-width: 1px !important;
          }
          .production-page {
            border-top: 2px solid #1f2937;
            margin-top: 12px;
            padding-top: 10px;
          }
          .production-image {
            max-height: 95mm;
          }
          .production-manual-block {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .manual-line-fill {
            border-bottom: 2px dashed #111827;
            width: 100%;
            display: block;
            height: 1.25rem;
          }
          .manual-observacao-box {
            min-height: 65px;
            border-bottom: 2px dashed #9ca3af;
          }
          .text-producao-1 {
            font-size: 54px;
            line-height: 0.9;
            font-weight: 900;
            text-transform: uppercase;
          }
          .text-producao-2 {
            font-size: 96px;
            line-height: 0.85;
            font-weight: 900;
          }
          .text-producao-3 {
            font-size: 56px;
            line-height: 0.92;
            font-weight: 900;
            text-transform: uppercase;
          }
          .text-producao-4 {
            font-size: 48px;
            line-height: 0.95;
            font-weight: 900;
            text-transform: uppercase;
          }
          .text-producao-manual {
            font-size: 50px;
            line-height: 1;
            font-weight: 900;
            text-transform: uppercase;
          }
          .text-producao-observacao {
            font-size: 42px;
            line-height: 1;
            font-weight: 900;
            text-transform: uppercase;
          }
        }
        @media (max-width: 1200px) {
          .text-producao-1 { font-size: 40px; }
          .text-producao-2 { font-size: 74px; }
          .text-producao-3 { font-size: 42px; }
          .text-producao-4 { font-size: 36px; }
          .text-producao-manual { font-size: 36px; }
          .text-producao-observacao { font-size: 30px; }
        }
        @media screen {
          .ficha-pedido {
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            margin: 20px auto;
          }
          .production-page {
            margin-top: 24px;
          }
        }
        @media print {
          .production-page {
            page-break-before: always;
            break-before: page;
            border-top: 0;
            margin-top: 0;
            padding-top: 0;
          }
        }
      `}</style>

      {/* Cabeçalho com Data de Entrega em Destaque */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-gray-800">
        <div>
          <span className="text-lg font-bold">PEDIDO #{pedido.numero_pedido}</span>
          <span className="text-gray-500 ml-3 text-[11px]">Emitido: {format(new Date(), "dd/MM/yyyy HH:mm")}</span>
        </div>
        {pedido.data_entrega && (
          <div className="flex items-center gap-2 bg-yellow-200 border-2 border-yellow-600 px-4 py-1.5 rounded">
            <Calendar className="h-5 w-5 text-yellow-800" />
            <div>
              <span className="text-[10px] font-bold text-yellow-900 uppercase">Entrega: </span>
              <span className="text-base font-bold text-yellow-900">{format(parseDateString(pedido.data_entrega) || new Date(), "dd/MM/yyyy")}</span>
            </div>
          </div>
        )}
      </div>

      {/* Dados do Cliente e Pedido - Linha Única */}
      <div className="grid grid-cols-2 gap-4 mb-3 text-[11px]">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span><b className="font-bold">Cliente:</b> {pedido.cliente?.nome_razao_social || '-'}</span>
          {pedido.cliente?.cpf_cnpj && <span><b className="font-bold">CPF/CNPJ:</b> {pedido.cliente.cpf_cnpj}</span>}
          <span><b className="font-bold">Tel:</b> {pedido.cliente?.telefone || pedido.cliente?.whatsapp || '-'}</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 justify-end">
          <span><b className="font-bold">Data Pedido:</b> {format(parseDateString(pedido.data_pedido) || new Date(), "dd/MM/yyyy")}</span>
          <span><b className="font-bold">Vendedor:</b> {pedido.vendedor?.nome || '-'}</span>
        </div>
      </div>

      {temImagemAprovada && (
        <div className="mb-3 page-break">
          <div>
            <h2 className="text-[11px] font-bold text-gray-800 border-b-2 border-gray-400 pb-1 mb-2 uppercase">
              Imagem Aprovada
            </h2>
            <div className="flex justify-center">
              <img
                src={pedido.imagem_aprovacao_url}
                alt="Imagem aprovada do pedido"
                className="max-w-full max-h-[260px] object-contain border-2 border-green-500 rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* Itens do Pedido */}
      <div className="mb-2">
        <h2 className="text-[11px] font-bold text-gray-800 border-b-2 border-gray-400 pb-1 mb-2 uppercase">
          Itens do Pedido
        </h2>
        {pedido.itens?.map((item: any, index: number) => (
          <div key={index} className="item-block item-divider mb-3 pb-2 border-b-2 border-gray-300">
            {/* Cabeçalho do Item */}
            <div className="item-header flex items-center gap-3 mb-2 bg-gray-100 px-2 py-1 rounded">
              <span className="text-sm font-bold">
                ITEM {index + 1}: {item.produto?.nome?.toUpperCase() === 'XX' && item.nome_customizado 
                  ? item.nome_customizado 
                  : item.produto?.nome || 'Produto'}
                {item.produto?.codigo && item.produto?.nome !== 'XX' && (
                  <span className="text-gray-600 font-semibold ml-1">[{item.produto.codigo}]</span>
                )}
                {item.produto?.nome?.toUpperCase() === 'XX' && (
                  <span className="ml-2 px-1 bg-blue-100 text-blue-800 border border-blue-300 rounded text-[9px] uppercase">
                    Produto Manual
                  </span>
                )}
              </span>
              {item.tipo_estampa?.nome_tipo_estampa && (
                <span className="px-2 py-0.5 bg-blue-200 text-blue-900 rounded text-[10px] font-bold border border-blue-400">
                  {item.tipo_estampa.nome_tipo_estampa}
                </span>
              )}
              <span className="text-[11px] font-semibold"><b>Qtd:</b> {item.quantidade}</span>
            </div>

            {/* Layout: Imagem à esquerda (só se não houver imagem aprovada), informações à direita */}
            <div className="item-body flex gap-3">
              {/* Foto do Modelo - NÃO mostra se há imagem aprovada no pedido */}
              {item.foto_modelo_url && !(pedido.imagem_aprovada && pedido.imagem_aprovacao_url) && (
                <div className="flex-shrink-0">
                  <img
                    src={item.foto_modelo_url}
                    alt={`Modelo ${item.produto?.nome || 'Produto'}`}
                    className="item-model-image w-64 h-64 object-contain border border-gray-400"
                  />
                </div>
              )}

              {/* Informações ao lado da imagem */}
              <div className="flex-1 text-[11px] space-y-2">
                {/* Grade de Tamanhos */}
                {item.grades && item.grades.length > 0 && (
                  <div className="grade-box bg-gray-50 p-2 rounded border border-gray-200">
                    <span className="font-bold text-gray-800">Grade:</span>
                    <div className="grade-chips flex gap-1 flex-wrap mt-1">
                      {item.grades.map((grade: any, gIndex: number) => (
                        <span key={gIndex} className="px-2 py-1 bg-gray-300 rounded font-mono text-[11px] font-bold border border-gray-400">
                          {grade.tamanho_nome}({grade.quantidade})
                        </span>
                      ))}
                    </div>
                    <p className="grade-inline-print hidden">
                      {item.grades
                        .map((grade: any) => `${grade.tamanho_nome}(${grade.quantidade})`)
                        .join(' · ')}
                    </p>
                  </div>
                )}

                {/* Detalhes Adicionais */}
                {item.detalhes && item.detalhes.length > 0 && (
                  <div className="bg-blue-50 p-2 rounded border border-blue-200">
                    <span className="font-bold text-blue-900 text-[12px]">Detalhes:</span>
                    <div className="mt-1 space-y-1">
                      {item.detalhes.map((detalhe: any, dIndex: number) => {
                        const temQuebraLinha = detalhe.valor?.includes('\n');
                        const labelMap: Record<string, string> = {
                          nome_numero: 'Nome/Número',
                          cor_vies: 'Cor do Viés',
                          tipo_gola: 'Tipo de Gola',
                        };
                        const label = labelMap[detalhe.tipo_detalhe] || 
                          detalhe.tipo_detalhe.charAt(0).toUpperCase() + 
                          detalhe.tipo_detalhe.slice(1).replace(/_/g, ' ');

                        return (
                          <div key={dIndex} className={temQuebraLinha ? "block" : "inline-block mr-4"}>
                            <b className="text-blue-800 font-bold">{label}:</b>{' '}
                            <span className={temQuebraLinha ? "whitespace-pre-line block pl-3 text-gray-900 font-medium bg-white rounded p-1 mt-0.5 border-l-2 border-blue-400" : "text-gray-900 font-semibold"}>
                              {detalhe.valor}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Observações do Item */}
                {item.observacoes && (
                  <div className="bg-yellow-50 p-2 rounded border border-yellow-300">
                    <span className="font-bold text-yellow-800">Obs:</span>
                    <span className="text-gray-900 font-medium italic ml-2">{item.observacoes}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>


      {/* Linha de Corte */}
      <div className="border-t-2 border-dashed border-gray-400 my-3"></div>

      {/* Canhoto Destacável */}
      <div className="p-2 border border-gray-400 text-[10px]">
        <div className="flex justify-between items-center gap-2 mb-1">
          <span><b>PEDIDO:</b> #{pedido.numero_pedido}</span>
          <span><b>Cliente:</b> {pedido.cliente?.nome_razao_social || '-'}</span>
          {pedido.data_entrega && (
            <span><b>Entrega:</b> {format(parseDateString(pedido.data_entrega) || new Date(), "dd/MM/yyyy")}</span>
          )}
          <span><b>Qtd:</b> {pedido.itens?.reduce((sum: number, item: any) => sum + (Number(item.quantidade) || 0), 0) || 0} pç(s)</span>
          <span><b>Total:</b> {formatCurrency(valorTotal)}</span>
          {valorPendente > 0 ? (
            <span><b>Pendente:</b> {formatCurrency(valorPendente)}</span>
          ) : (
            <span className="font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded border border-green-400">✓ QUITADO</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-300">
          <div>
            <span className="font-semibold">Retirado por:</span>
            <div className="border-b border-gray-400 h-4 mt-0.5"></div>
          </div>
          {valorPendente > 0 && (
            <div>
              <span className="font-semibold">Forma Pgto Pendente:</span>
              <div className="border-b border-gray-400 h-4 mt-0.5"></div>
            </div>
          )}
          <div>
            <span className="font-semibold">Assinatura:</span>
            <div className="border-b border-gray-400 h-4 mt-0.5"></div>
          </div>
          <div className="whitespace-nowrap">
            <span className="font-semibold">Data:</span> ___/___/______
          </div>
        </div>
      </div>

      {/* Segunda Pagina - Ficha de Producao */}
      <div className="production-page">
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-gray-800">
          <div>
            <span className="text-lg font-bold">PEDIDO #{pedido.numero_pedido}</span>
            <span className="text-gray-500 ml-3 text-[11px]">
              Emitido: {format(new Date(), 'dd/MM/yyyy HH:mm')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-3 text-[11px]">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span><b className="font-bold">Cliente:</b> {pedido.cliente?.nome_razao_social || '-'}</span>
            {pedido.cliente?.cpf_cnpj && <span><b className="font-bold">CPF/CNPJ:</b> {pedido.cliente.cpf_cnpj}</span>}
            <span><b className="font-bold">Tel:</b> {pedido.cliente?.telefone || pedido.cliente?.whatsapp || '-'}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 justify-end">
            <span><b className="font-bold">Data Pedido:</b> {format(parseDateString(pedido.data_pedido) || new Date(), 'dd/MM/yyyy')}</span>
            <span><b className="font-bold">Vendedor:</b> {pedido.vendedor?.nome || '-'}</span>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-end gap-3">
            <span className="text-producao-1">Data de entrega</span>
            <span className="text-producao-2 text-red-700">{dataEntregaProducao}</span>
          </div>

          <p className="text-producao-3">{diaSemanaEntregaCapitalizado}</p>

          <p className="text-producao-4">
            Quantidade de pecas: <span className="text-red-700">{quantidadeTotalPecas}</span>
          </p>
        </div>

        <div className="flex justify-center mb-6">
          {imagemPrincipalProducao ? (
            <img
              src={imagemPrincipalProducao}
              alt="Imagem principal para producao"
              className="production-image max-w-full object-contain border border-gray-300 rounded"
            />
          ) : (
            <div className="w-[330px] h-[280px] flex items-center justify-center bg-blue-500 text-white font-black uppercase text-2xl rounded">
              Modelo
            </div>
          )}
        </div>

        <div className="production-manual-block">
          <div className="space-y-3">
            <div className="flex items-end gap-2">
              <span className="text-producao-manual whitespace-nowrap">Impressao:</span>
              <span className="manual-line-fill" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-producao-manual whitespace-nowrap">Costura:</span>
              <span className="manual-line-fill" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-producao-manual whitespace-nowrap">Pedido pronto:</span>
              <span className="manual-line-fill" />
            </div>
          </div>

          <div className="mt-4">
            <p className="text-gray-400 text-producao-observacao">observacao:</p>
            <div className="manual-observacao-box" />
          </div>
        </div>
      </div>
    </div>
  );
}
