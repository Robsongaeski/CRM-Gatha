import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, MessageCircle } from "lucide-react";
import { CartHeader } from "@/components/cart/CartHeader";
import { CartItemCard } from "@/components/cart/CartItemCard";
import { CrossSell } from "@/components/cart/CrossSell";
import { DiscountProgress } from "@/components/cart/DiscountProgress";
import { EmptyCart } from "@/components/cart/EmptyCart";
import { OrderSummary } from "@/components/cart/OrderSummary";
import { TrustSignals } from "@/components/cart/TrustSignals";
import { useCart } from "@/contexts/CartContext";
import { formatBRL } from "@/data/products";
import { WHATSAPP_NUMBER } from "@/data/category";

export default function CartPage() {
  const { items, totalQty, discountedTotal, savings, tier } = useCart();

  useEffect(() => {
    document.title = "Seu Carrinho · AgroTech Performance";
    const meta = document.querySelector('meta[name="description"]');
    const desc = "Revise seu pedido, aproveite o desconto progressivo de atacado e finalize sua compra com segurança.";
    if (meta) meta.setAttribute("content", desc);
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = desc;
      document.head.appendChild(m);
    }
  }, []);

  const whatsappHref = useMemo(() => {
    const lines = [
      "Olá! Quero finalizar este pedido pelo WhatsApp:",
      "",
      ...items.map(
        (i) =>
          `• ${i.qty}× ${i.productName.split("—")[0].trim()} · Tam ${i.sizeLabel}` +
          (i.customization?.positions?.length
            ? ` · Logo: ${i.customization.positions.join(" + ").toLowerCase()}`
            : "") +
          (i.customization?.team
            ? ` · Time: ${i.customization.team.teamName || "personalizado"}`
            : ""),
      ),
      "",
      `Total de unidades: ${totalQty}`,
      `Faixa: ${tier.label} (${tier.discountPct}% OFF)`,
      `Total estimado: ${formatBRL(discountedTotal)}`,
      "",
      "Poderia me ajudar com a finalização?",
    ];
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
  }, [items, totalQty, discountedTotal, tier]);

  const handleCheckout = () => {
    window.open(whatsappHref, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-background pb-32 lg:pb-12">
      <CartHeader />

      {items.length === 0 ? (
        <main className="max-w-5xl mx-auto">
          <EmptyCart />
        </main>
      ) : (
        <main className="max-w-5xl mx-auto px-4 py-5 sm:py-8">
          <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-8">
            {/* LEFT — Itens + cross-sell */}
            <div className="space-y-4 sm:space-y-5">
              <DiscountProgress />

              <ul className="space-y-3">
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <li key={item.id}>
                      <CartItemCard item={item} />
                    </li>
                  ))}
                </AnimatePresence>
              </ul>

              <div className="pt-4">
                <CrossSell />
              </div>
            </div>

            {/* RIGHT — Sticky summary on desktop */}
            <aside className="mt-6 lg:mt-0 lg:sticky lg:top-20 lg:self-start space-y-4">
              <OrderSummary />

              {/* Desktop CTAs */}
              <div className="hidden lg:flex flex-col gap-2.5">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCheckout}
                  className="inline-flex items-center justify-center gap-2 w-full h-14 rounded-xl bg-foreground text-primary-foreground font-semibold text-base hover:bg-brand-soft transition-colors"
                >
                  <Lock className="h-4 w-4" strokeWidth={2.5} />
                  Finalizar Compra
                </motion.button>
                <motion.a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center justify-center gap-2 w-full h-14 rounded-xl bg-whatsapp text-whatsapp-foreground font-semibold text-base hover:opacity-95 transition-opacity"
                >
                  <MessageCircle className="h-5 w-5" strokeWidth={2} fill="currentColor" />
                  Finalizar Pedido via WhatsApp
                </motion.a>
              </div>

              <div className="hidden lg:block">
                <TrustSignals />
              </div>
            </aside>
          </div>

          {/* Mobile trust + summary echo */}
          <div className="lg:hidden mt-6">
            <TrustSignals />
          </div>
        </main>
      )}

      {/* MOBILE STICKY BOTTOM */}
      {items.length > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.15)]"
        >
          <div className="max-w-5xl mx-auto px-4 py-3 space-y-2.5">
            <div className="flex items-baseline justify-between">
              <div className="text-xs text-muted-foreground">
                {totalQty} {totalQty === 1 ? "item" : "itens"}
                {savings > 0 && (
                  <span className="ml-1.5 text-price-deal font-semibold">
                    · você economiza {formatBRL(savings)}
                  </span>
                )}
              </div>
              <div className="text-lg font-extrabold text-foreground tabular-nums">
                {formatBRL(discountedTotal)}
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-2">
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={handleCheckout}
                className="inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-foreground text-primary-foreground font-semibold text-sm hover:bg-brand-soft transition-colors"
              >
                <Lock className="h-4 w-4" strokeWidth={2.5} />
                Finalizar Compra
              </motion.button>
              <motion.a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                whileTap={{ scale: 0.98 }}
                aria-label="Finalizar via WhatsApp"
                className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-whatsapp text-whatsapp-foreground hover:opacity-95 transition-opacity"
              >
                <MessageCircle className="h-5 w-5" strokeWidth={2} fill="currentColor" />
              </motion.a>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
