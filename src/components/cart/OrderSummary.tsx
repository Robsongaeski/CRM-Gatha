import { useState } from "react";
import { ChevronDown, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { formatBRL } from "@/data/products";
import { toast } from "sonner";

export function OrderSummary() {
  const { subtotal, discountedTotal, savings, tier, totalQty } = useCart();
  const [open, setOpen] = useState(false);
  const [coupon, setCoupon] = useState("");

  const apply = () => {
    if (!coupon.trim()) return;
    toast.error("Cupom inválido", { description: "Tente outro código ou fale com o atendente." });
  };

  return (
    <section
      aria-label="Resumo do pedido"
      className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3"
    >
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
        Resumo do pedido
      </h2>

      <dl className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Subtotal ({totalQty} un)</dt>
          <dd className="font-medium text-foreground tabular-nums">{formatBRL(subtotal)}</dd>
        </div>

        {savings > 0 && (
          <motion.div
            key={savings}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <dt className="text-price-deal font-medium">
              Desconto Atacado · {tier.discountPct}%
            </dt>
            <dd className="font-bold text-price-deal tabular-nums">−{formatBRL(savings)}</dd>
          </motion.div>
        )}

        <div className="h-px bg-border my-1" />

        <div className="flex items-baseline justify-between">
          <dt className="text-base font-bold text-foreground">Total</dt>
          <motion.dd
            key={discountedTotal}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-extrabold text-foreground tabular-nums"
          >
            {formatBRL(discountedTotal)}
          </motion.dd>
        </div>
        <p className="text-[11px] text-muted-foreground -mt-1">
          ou em até 6x sem juros · frete calculado no checkout
        </p>
      </dl>

      <div className="pt-1">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Tag className="h-3.5 w-3.5" />
          Tenho um cupom de desconto
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex gap-2 pt-2">
                <Input
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                  placeholder="Código do cupom"
                  className="h-10"
                />
                <Button type="button" onClick={apply} variant="outline" className="h-10">
                  Aplicar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
