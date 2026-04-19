import { useEffect, useState } from "react";
import { Menu, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";

export function ProductHeader() {
  const [scrolled, setScrolled] = useState(false);
  const { totalQty } = useCart();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 bg-background/95 backdrop-blur-md transition-shadow ${
        scrolled ? "shadow-[0_1px_0_0_hsl(var(--border))]" : ""
      }`}
    >
      <div className="h-14 lg:h-16 flex items-center justify-between px-4 lg:px-8 max-w-7xl mx-auto">
        <button
          aria-label="Abrir menu"
          className="h-12 w-12 -ml-3 flex items-center justify-center text-foreground"
        >
          <Menu className="h-6 w-6" strokeWidth={1.75} />
        </button>

        <Link to="/" className="flex flex-col items-center leading-none" aria-label="Gatha Confecções — página inicial">
          <span className="font-black text-base lg:text-lg tracking-[0.18em]">GATHA</span>
          <span className="hidden lg:block mt-1 text-[9px] tracking-[0.3em] text-muted-foreground font-semibold uppercase">
            Confecções
          </span>
        </Link>

        <Link
          to="/carrinho"
          aria-label={`Abrir carrinho com ${totalQty} ${totalQty === 1 ? "item" : "itens"}`}
          className="h-12 w-12 -mr-3 flex items-center justify-center text-foreground relative"
        >
          <ShoppingBag className="h-6 w-6" strokeWidth={1.75} />
          {totalQty > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-foreground text-primary-foreground text-[10px] font-bold inline-flex items-center justify-center tabular-nums">
              {totalQty > 99 ? "99+" : totalQty}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
