import { usePermissions } from './usePermissions';

export function useCanViewPedidoValues() {
  const { can, isAdmin, isLoading } = usePermissions();

  return {
    canViewPedidoValues: isAdmin || can('pedidos.valores.visualizar'),
    isLoadingPermissions: isLoading,
  };
}
