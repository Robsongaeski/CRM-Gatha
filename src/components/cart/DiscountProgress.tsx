import { motion } from "framer-motion";
import { Sparkles, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useCart } from "@/contexts/CartContext";

export function DiscountProgress() {
  const { totalQty, tier, nextTier, unitsToNext } = useCart();

  // Progress within current bracket toward next tier
  const start = tier.minQty;
  const end = nextTier ? nextTier.minQty : start + 1;
  const span = Math.max(1, end - start);
  const within = Math.max(0, totalQty - start);
  const pct = nextTier ? Math.min(100, Math.round((within / span) * 100)) : 100;

  const isMaxed = !nextTier;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-border bg-surface-soft p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div
          className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
            isMaxed ? "bg-price-deal-bg text-price-deal" : "bg-foreground text-primary-foreground"
          }`}
        >
          {isMaxed ? <Sparkles className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          {isMaxed ? (
            <p className="text-sm font-semibold text-foreground leading-snug">
              Parabéns! Você desbloqueou o desconto de Atacado{" "}
              <span className="text-price-deal">({tier.discountPct}% OFF)</span>.
            </p>
          ) : (
            <p className="text-sm font-semibold text-foreground leading-snug">
              Adicione mais{" "}
              <span className="text-foreground font-extrabold">{unitsToNext}</span>{" "}
              {unitsToNext === 1 ? "peça" : "peças"} para ganhar{" "}
              <span className="text-price-deal font-extrabold">{nextTier!.discountPct}% OFF</span>.
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            Faixa atual: <span className="font-medium text-foreground">{tier.label}</span> ·{" "}
            {tier.range}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <Progress value={pct} className="h-2 bg-muted" />
        <div className="flex justify-between mt-1.5 text-[11px] text-muted-foreground tabular-nums">
          <span>{totalQty} un</span>
          {nextTier && <span>{nextTier.minQty} un · {nextTier.discountPct}%</span>}
        </div>
      </div>
    </motion.div>
  );
}
