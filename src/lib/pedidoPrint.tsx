import { createRoot } from 'react-dom/client';
import { supabase } from '@/integrations/supabase/client';
import { FichaPedidoPrint } from '@/components/Pedidos/FichaPedidoPrint';

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function printPedidoFichaById(pedidoId: string): Promise<void> {
  if (!pedidoId) {
    throw new Error('Pedido não informado para impressão.');
  }

  const [{ data: pedido, error: pedidoError }, { data: pagamentos, error: pagamentosError }] =
    await Promise.all([
      supabase
        .from('pedidos')
        .select(`
          *,
          cliente:clientes(*),
          vendedor:profiles(*),
          itens:pedido_itens(
            *,
            produto:produtos(*),
            tipo_estampa:tipo_estampa(id, nome_tipo_estampa),
            detalhes:pedido_item_detalhes(*),
            grades:pedido_item_grades(*)
          )
        `)
        .eq('id', pedidoId)
        .maybeSingle(),
      supabase
        .from('pagamentos')
        .select('*')
        .eq('pedido_id', pedidoId)
        .order('created_at', { ascending: false }),
    ]);

  if (pedidoError) throw pedidoError;
  if (pagamentosError) throw pagamentosError;
  if (!pedido) throw new Error('Pedido não encontrado.');

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Não foi possível abrir a janela de impressão. Verifique o bloqueio de pop-up.');
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Ficha de Pedido #${pedido.numero_pedido}</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>
        <div id="print-root"></div>
      </body>
    </html>
  `);
  printWindow.document.close();

  await wait(900);

  const container = printWindow.document.getElementById('print-root');
  if (!container) {
    throw new Error('Falha ao montar a área de impressão.');
  }

  const root = createRoot(container);
  root.render(<FichaPedidoPrint pedido={pedido} pagamentos={pagamentos || []} />);

  await wait(600);

  printWindow.focus();
  printWindow.print();
}

