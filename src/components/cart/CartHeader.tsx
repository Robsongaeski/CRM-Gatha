import { ArrowLeft, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";

export function CartHeader() {
  const { totalQty } = useCart();
  return (
    <header className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border">
      <div className="max-w-5xl mx-auto h-14 px-4 flex items-center justify-between">
        <Link
          to="/"
          aria-label="Voltar para a coleção"
          className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-muted-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2} />
          <span className="hidden sm:inline">Continuar comprando</span>
        </Link>

        <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground">
          Seu carrinho
        </h1>

        <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
          <ShoppingBag className="h-4 w-4" strokeWidth={2} />
          {totalQty}
        </div>
      </div>
    </header>
  );
}
