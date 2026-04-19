import { useEffect, useState } from "react";
import { ChevronDown, ShoppingBag } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { categories } from "@/data/categories";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function GlobalHeader() {
  const [scrolled, setScrolled] = useState(false);
  const { totalQty } = useCart();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActiveCategory = (slug: string) =>
    location.pathname === `/categoria/${slug}` || location.pathname.startsWith(`/categoria/${slug}/`);

  return (
    <header
      className={`sticky top-0 z-40 bg-background/95 backdrop-blur-md transition-shadow ${
        scrolled ? "shadow-[0_1px_0_0_hsl(var(--border))]" : ""
      }`}
    >
      <div className="h-14 lg:h-16 flex items-center justify-between px-4 lg:px-8 max-w-7xl mx-auto gap-3">
        {/* Categorias dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Abrir categorias"
            className="inline-flex items-center gap-1.5 h-10 px-3 -ml-3 rounded-full text-foreground hover:bg-muted/50 transition-colors text-sm font-semibold"
          >
            Categorias
            <ChevronDown className="h-4 w-4" strokeWidth={2} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 bg-background border-border">
            {categories.map((c) => (
              <DropdownMenuItem key={c.slug} asChild>
                <Link
                  to={c.routePath ?? `/categoria/${c.slug}`}
                  className={`cursor-pointer flex items-start gap-3 py-3 ${
                    isActiveCategory(c.slug) ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">{c.name}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{c.hubTagline}</div>
                  </div>
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

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
