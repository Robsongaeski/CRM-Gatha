import { ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";

export function EmptyCart() {
  return (
    <div className="text-center py-16 px-6">
      <div className="mx-auto h-16 w-16 rounded-full bg-surface-soft flex items-center justify-center mb-5">
        <ShoppingBag className="h-7 w-7 text-foreground" strokeWidth={1.75} />
      </div>
      <h2 className="text-xl font-extrabold tracking-tight text-foreground">
        Seu carrinho está vazio
      </h2>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
        Explore a coleção AgroTech e monte o pedido da sua equipe com desconto progressivo.
      </p>
      <Link
        to="/"
        className="inline-flex items-center justify-center mt-6 h-12 px-6 rounded-full bg-foreground text-primary-foreground font-semibold text-sm hover:bg-brand-soft transition-colors"
      >
        Ver coleção
      </Link>
    </div>
  );
}
