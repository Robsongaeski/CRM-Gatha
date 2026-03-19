import { format } from 'date-fns';
import { Calendar } from 'lucide-react';
import { parseDateString } from '@/lib/formatters';

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="ficha-pedido bg-white text-black p-4 max-w-[210mm] mx-auto text-[12px]">
      <style>{`
        @media print {
          @page { 
            size: A4;
            margin: 8mm;
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
            padding: 8mm;
            box-shadow: none !important;
          }
          .page-break { 
            page-break-inside: avoid; 
          }
        }
        @media screen {
          .ficha-pedido {
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            margin: 20px auto;
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

      {/* Observações Gerais - Antes dos Itens */}
      {pedido.observacao && (
        <div className="mb-3 p-2 bg-orange-50 border-2 border-orange-300 text-[11px] rounded">
          <span className="font-bold uppercase text-orange-800">Observações Gerais: </span>
          <span className="text-gray-900 font-medium whitespace-pre-line">{pedido.observacao}</span>
        </div>
      )}

      {/* Imagem Principal Aprovada */}
      {pedido.imagem_aprovada && pedido.imagem_aprovacao_url && (
        <div className="mb-3 page-break">
          <h2 className="text-[11px] font-bold text-gray-800 border-b-2 border-gray-400 pb-1 mb-2 uppercase">
            Imagem Aprovada
          </h2>
          <div className="flex justify-center">
            <img
              src={pedido.imagem_aprovacao_url}
              alt="Imagem aprovada do pedido"
              className="max-w-[280px] max-h-[280px] object-contain border-2 border-green-500 rounded"
            />
          </div>
        </div>
      )}

      {/* Itens do Pedido */}
      <div className="mb-2">
        <h2 className="text-[11px] font-bold text-gray-800 border-b-2 border-gray-400 pb-1 mb-2 uppercase">
          Itens do Pedido
        </h2>
        {pedido.itens?.map((item: any, index: number) => (
          <div key={index} className="mb-4 pb-3 border-b-2 border-gray-300 page-break">
            {/* Cabeçalho do Item */}
            <div className="flex items-center gap-3 mb-2 bg-gray-100 px-2 py-1 rounded">
              <span className="text-sm font-bold">
                ITEM {index + 1}: {item.produto?.nome || 'Produto'}
                {item.produto?.codigo && <span className="text-gray-600 font-semibold ml-1">[{item.produto.codigo}]</span>}
              </span>
              {item.tipo_estampa?.nome_tipo_estampa && (
                <span className="px-2 py-0.5 bg-blue-200 text-blue-900 rounded text-[10px] font-bold border border-blue-400">
                  {item.tipo_estampa.nome_tipo_estampa}
                </span>
              )}
              <span className="text-[11px] font-semibold"><b>Qtd:</b> {item.quantidade}</span>
            </div>

            {/* Layout: Imagem à esquerda (só se não houver imagem aprovada), informações à direita */}
            <div className="flex gap-3">
              {/* Foto do Modelo - NÃO mostra se há imagem aprovada no pedido */}
              {item.foto_modelo_url && !(pedido.imagem_aprovada && pedido.imagem_aprovacao_url) && (
                <div className="flex-shrink-0">
                  <img
                    src={item.foto_modelo_url}
                    alt={`Modelo ${item.produto?.nome || 'Produto'}`}
                    className="w-64 h-64 object-contain border border-gray-400"
                  />
                </div>
              )}

              {/* Informações ao lado da imagem */}
              <div className="flex-1 text-[11px] space-y-2">
                {/* Grade de Tamanhos */}
                {item.grades && item.grades.length > 0 && (
                  <div className="bg-gray-50 p-2 rounded border border-gray-200">
                    <span className="font-bold text-gray-800">Grade:</span>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {item.grades.map((grade: any, gIndex: number) => (
                        <span key={gIndex} className="px-2 py-1 bg-gray-300 rounded font-mono text-[11px] font-bold border border-gray-400">
                          {grade.tamanho_nome}({grade.quantidade})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detalhes Adicionais */}
                {item.detalhes && item.detalhes.length > 0 && (
                  <div className="bg-blue-50 p-2 rounded border border-blue-200">
                    <span className="font-bold text-blue-900 text-[12px]">Detalhes:</span>
                    <div className="mt-1 space-y-1">
                      {item.detalhes.map((detalhe: any, dIndex: number) => {
                        const temQuebraLinha = detalhe.valor?.includes('\n');
                        return (
                          <div key={dIndex} className={temQuebraLinha ? "block" : "inline-block mr-4"}>
                            <b className="capitalize text-blue-800 font-bold">{detalhe.tipo_detalhe}:</b>{' '}
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
    </div>
  );
}
