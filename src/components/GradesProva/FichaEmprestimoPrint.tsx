import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EmprestimoGradeProva } from '@/hooks/useEmprestimosGradeProva';

interface FichaEmprestimoPrintProps {
  emprestimo: EmprestimoGradeProva;
}

export const FichaEmprestimoPrint = forwardRef<HTMLDivElement, FichaEmprestimoPrintProps>(
  ({ emprestimo }, ref) => {
    const totalItens = emprestimo.itens?.reduce((sum, i) => sum + i.quantidade, 0) || 0;

    return (
      <div ref={ref} className="p-6 bg-white text-black min-h-[29.7cm] w-[21cm] print:p-4">
        {/* Cabeçalho */}
        <div className="border-2 border-black">
          <div className="bg-gray-100 p-3 border-b-2 border-black">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold uppercase tracking-wide">
                Comprovante de Empréstimo de Grade para Prova
              </h1>
              <div className="text-right">
                <div className="text-2xl font-bold">Nº {emprestimo.numero_emprestimo.toString().padStart(5, '0')}</div>
                <div className="text-sm">
                  {format(new Date(emprestimo.data_emprestimo), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
              </div>
            </div>
          </div>

          {/* Dados do Cliente */}
          <div className="p-3 border-b-2 border-black">
            <h2 className="font-bold text-sm uppercase mb-2 text-gray-600">Dados do Cliente</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-semibold">Nome:</span> {emprestimo.cliente?.nome_razao_social}
              </div>
              <div>
                <span className="font-semibold">CPF/CNPJ:</span> {emprestimo.cliente?.cpf_cnpj || '-'}
              </div>
              <div>
                <span className="font-semibold">Telefone:</span> {emprestimo.cliente?.telefone || emprestimo.cliente?.whatsapp || '-'}
              </div>
              <div>
                <span className="font-semibold">Endereço:</span> {emprestimo.cliente?.endereco || '-'}
              </div>
            </div>
          </div>

          {/* Informações do Empréstimo */}
          <div className="p-3 border-b-2 border-black bg-yellow-50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-semibold">Vendedor:</span> {emprestimo.vendedor?.nome}
              </div>
              <div className="text-right">
                <span className="font-bold text-lg">
                  PRAZO DE DEVOLUÇÃO: {format(new Date(emprestimo.data_prevista_devolucao), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
            </div>
          </div>

          {/* Itens do Empréstimo */}
          <div className="p-3 border-b-2 border-black">
            <h2 className="font-bold text-sm uppercase mb-2 text-gray-600">Itens Emprestados</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-400">
                  <th className="text-left py-2 font-semibold">Descrição</th>
                  <th className="text-center py-2 font-semibold w-20">Qtd</th>
                  <th className="text-left py-2 font-semibold">Tamanhos</th>
                </tr>
              </thead>
              <tbody>
                {emprestimo.itens?.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-2">{item.descricao}</td>
                    <td className="text-center py-2 font-semibold">{item.quantidade}</td>
                    <td className="py-2 text-gray-600">{item.tamanhos || '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold bg-gray-100">
                  <td className="py-2">TOTAL</td>
                  <td className="text-center py-2">{totalItens}</td>
                  <td className="py-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Observações */}
          {emprestimo.observacao_saida && (
            <div className="p-3 border-b-2 border-black">
              <h2 className="font-bold text-sm uppercase mb-1 text-gray-600">Observações</h2>
              <p className="text-sm">{emprestimo.observacao_saida}</p>
            </div>
          )}

          {/* Termo de Responsabilidade */}
          <div className="p-3 border-b-2 border-black bg-gray-50">
            <p className="text-sm text-justify">
              Declaro que recebi os itens acima descritos em perfeitas condições para prova de tamanhos.
              Comprometo-me a devolvê-los até a data limite acima indicada, nas mesmas condições em que foram entregues.
              Estou ciente de que qualquer dano ou perda será de minha total responsabilidade.
            </p>
          </div>

          {/* Assinatura */}
          <div className="p-4">
            <div className="flex justify-between items-end">
              <div className="w-2/3">
                <div className="border-b border-black mb-1"></div>
                <p className="text-sm">Assinatura do Cliente</p>
              </div>
              <div className="w-1/4 text-right">
                <p className="text-sm">Data: ____/____/________</p>
              </div>
            </div>
          </div>
        </div>

        {/* Linha de corte */}
        <div className="border-t-2 border-dashed border-gray-400 my-4 relative">
          <span className="absolute left-1/2 -translate-x-1/2 -top-2 bg-white px-2 text-xs text-gray-500">
            ✂️ Corte aqui - 2ª via (Empresa)
          </span>
        </div>

        {/* Canhoto - 2ª via */}
        <div className="border-2 border-black p-3">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h2 className="font-bold text-sm uppercase">Comprovante de Empréstimo</h2>
              <p className="text-xs text-gray-500">2ª Via - Controle Interno</p>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg">Nº {emprestimo.numero_emprestimo.toString().padStart(5, '0')}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            <div><span className="font-semibold">Cliente:</span> {emprestimo.cliente?.nome_razao_social}</div>
            <div><span className="font-semibold">Vendedor:</span> {emprestimo.vendedor?.nome}</div>
            <div><span className="font-semibold">Data:</span> {format(new Date(emprestimo.data_emprestimo), "dd/MM/yyyy", { locale: ptBR })}</div>
            <div className="font-bold text-destructive">
              <span className="font-semibold">Prazo:</span> {format(new Date(emprestimo.data_prevista_devolucao), "dd/MM/yyyy", { locale: ptBR })}
            </div>
          </div>

          <div className="text-sm mb-3">
            <span className="font-semibold">Itens:</span> {totalItens} peça(s) - 
            {emprestimo.itens?.map(i => ` ${i.quantidade}x ${i.descricao}`).join(', ')}
          </div>

          <div className="flex justify-between items-end pt-2 border-t border-gray-300">
            <div className="w-1/2">
              <div className="border-b border-black mb-1"></div>
              <p className="text-xs">Assinatura do Cliente</p>
            </div>
            <div className="text-xs text-right">
              <p>☐ Devolvido em: ____/____/____</p>
              <p>☐ Recebido por: ________________</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

FichaEmprestimoPrint.displayName = 'FichaEmprestimoPrint';
