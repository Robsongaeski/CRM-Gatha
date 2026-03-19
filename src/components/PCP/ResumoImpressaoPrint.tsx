import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateString } from '@/lib/formatters';

interface PedidoItem {
  id: string;
  quantidade: number;
  observacoes?: string;
  foto_modelo_url?: string;
  produto?: { nome: string };
  grades?: Array<{
    tamanho_nome: string;
    tamanho_codigo: string;
    quantidade: number;
  }>;
  detalhes?: Array<{
    tipo_detalhe: string;
    valor: string;
  }>;
}

interface Pedido {
  id: string;
  numero_pedido: number;
  data_entrega?: string;
  observacao?: string;
  cliente?: {
    nome_razao_social: string;
    telefone?: string;
    whatsapp?: string;
  };
  itens?: PedidoItem[];
}

interface ResumoImpressaoPrintProps {
  pedidos: Pedido[];
}

export const ResumoImpressaoPrint = forwardRef<HTMLDivElement, ResumoImpressaoPrintProps>(
  ({ pedidos }, ref) => {
    return (
      <div ref={ref} className="print-content">
        <style>{`
          @media print {
            @page {
              size: A4;
              margin: 10mm;
            }
            
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            
            .print-content {
              width: 100%;
            }
            
            .grid-container {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 8mm;
              page-break-inside: avoid;
            }
            
            .pedido-card {
              border: 1px solid #333;
              padding: 4mm;
              break-inside: avoid;
              page-break-inside: avoid;
              display: flex;
              flex-direction: column;
              min-height: 130mm;
            }
            
            .pedido-header {
              font-size: 10pt;
              font-weight: bold;
              line-height: 1.3;
              margin-bottom: 3mm;
              border-bottom: 1px solid #666;
              padding-bottom: 2mm;
            }
            
            .foto-container {
              flex: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 2mm 0;
              min-height: 80mm;
              max-height: 90mm;
              overflow: hidden;
            }
            
            .foto-modelo {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
              display: block;
            }
            
            .sem-foto {
              width: 100%;
              height: 80mm;
              display: flex;
              align-items: center;
              justify-content: center;
              background-color: #f0f0f0;
              color: #666;
              font-size: 9pt;
            }
            
            .info-section {
              font-size: 9pt;
              line-height: 1.4;
              margin-top: 2mm;
            }
            
            .info-section p {
              margin: 1mm 0;
            }
            
            .grade-list {
              display: flex;
              flex-wrap: wrap;
              gap: 3mm;
              font-size: 8pt;
            }
            
            .grade-item {
              display: inline-block;
            }
            
            .page-break {
              page-break-after: always;
            }
          }
        `}</style>

        <div className="grid-container">
          {pedidos.map((pedido, index) => {
            const quantidadeTotal = pedido.itens?.reduce((acc, item) => acc + item.quantidade, 0) || 0;
            const telefone = pedido.cliente?.telefone || pedido.cliente?.whatsapp || '';
            
            // Pegar foto do primeiro item (se houver)
            const fotoModelo = pedido.itens?.[0]?.foto_modelo_url;
            
            // Consolidar grades de todos os itens
            const gradesConsolidadas: Record<string, number> = {};
            pedido.itens?.forEach(item => {
              item.grades?.forEach(grade => {
                const key = grade.tamanho_nome;
                gradesConsolidadas[key] = (gradesConsolidadas[key] || 0) + grade.quantidade;
              });
            });
            
            // Consolidar detalhes
            const detalhes: string[] = [];
            pedido.itens?.forEach(item => {
              item.detalhes?.forEach(detalhe => {
                const info = `${detalhe.tipo_detalhe}: ${detalhe.valor}`;
                if (!detalhes.includes(info)) {
                  detalhes.push(info);
                }
              });
            });
            
            // Consolidar observações
            const observacoes: string[] = [];
            if (pedido.observacao) {
              observacoes.push(pedido.observacao);
            }
            pedido.itens?.forEach(item => {
              if (item.observacoes && !observacoes.includes(item.observacoes)) {
                observacoes.push(item.observacoes);
              }
            });

            return (
              <div key={pedido.id} className="pedido-card">
                <div className="pedido-header">
                  <div>NOME: {pedido.cliente?.nome_razao_social || 'Cliente não informado'}</div>
                  {telefone && <div>TELEFONE: {telefone}</div>}
                  <div>(QUANTIDADE: {quantidadeTotal} unidade{quantidadeTotal !== 1 ? 's' : ''})</div>
                  {pedido.data_entrega && (
                    <div>
                      DATA ENTREGA: {format(parseDateString(pedido.data_entrega) || new Date(), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  )}
                </div>

                <div className="foto-container">
                  {fotoModelo ? (
                    <img 
                      src={fotoModelo} 
                      alt="Modelo do pedido"
                      className="foto-modelo"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        const semFoto = document.createElement('div');
                        semFoto.className = 'sem-foto';
                        semFoto.textContent = 'Foto não disponível';
                        (e.target as HTMLImageElement).parentElement?.appendChild(semFoto);
                      }}
                    />
                  ) : (
                    <div className="sem-foto">Sem foto do modelo</div>
                  )}
                </div>

                <div className="info-section">
                  {Object.keys(gradesConsolidadas).length > 0 && (
                    <div>
                      <strong>Grade:</strong>
                      <div className="grade-list">
                        {Object.entries(gradesConsolidadas)
                          .sort(([a], [b]) => {
                            // Ordenar tamanhos: P, M, G, GG, XG, etc
                            const ordem = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XGG'];
                            const indexA = ordem.indexOf(a);
                            const indexB = ordem.indexOf(b);
                            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                            if (indexA !== -1) return -1;
                            if (indexB !== -1) return 1;
                            return a.localeCompare(b);
                          })
                          .map(([tamanho, qtd]) => (
                            <span key={tamanho} className="grade-item">
                              {tamanho}({qtd})
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                  
                  {detalhes.length > 0 && (
                    <div>
                      <strong>Detalhes:</strong>
                      {detalhes.map((det, i) => (
                        <div key={i}>• {det}</div>
                      ))}
                    </div>
                  )}
                  
                  {observacoes.length > 0 && (
                    <div>
                      <strong>Observações:</strong>
                      {observacoes.map((obs, i) => (
                        <div key={i}>• {obs}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

ResumoImpressaoPrint.displayName = 'ResumoImpressaoPrint';
