import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { VolumeTier } from "@/data/products";
import { formatBRL, getNextTier } from "@/data/products";

type Props = {
  tiers: VolumeTier[];
  totalQty: number;
  activeTierId: string;
};

export function VolumePricing({ tiers, totalQty, activeTierId }: Props) {
  const next = getNextTier(tiers, Math.max(1, totalQty));
  const remaining = next ? Math.max(0, next.minQty - totalQty) : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-foreground">
          Faixas de preço{" "}
          <span className="text-xs font-normal text-muted-foreground">· quanto mais, mais barato</span>
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {tiers.map((tier) => {
          const isActive = tier.id === activeTierId;
          return (
            <motion.div
              key={tier.id}
              animate={{ scale: isActive ? 1 : 0.99 }}
              transition={{ duration: 0.2 }}
              className={`relative text-left rounded-xl border-2 p-3 min-h-[120px] flex flex-col justify-between transition-colors ${
                isActive
                  ? "border-foreground bg-foreground/[0.03]"
                  : "border-border/70 bg-background"
              }`}
              aria-current={isActive ? "true" : undefined}
            >
              {tier.recommended && !isActive && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-foreground text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap">
                  Recomendado
                </span>
              )}

              {tier.discountPct > 0 && (
                <span className="absolute top-2 right-2 bg-scarcity text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">
                  -{tier.discountPct}%
                </span>
              )}

              {isActive && (
                <span className="absolute top-2 left-2 h-4 w-4 rounded-full bg-foreground flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
                </span>
              )}

              <div className="mt-4">
                <div className="text-xs font-bold uppercase tracking-wide text-foreground">
                  {tier.label}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                  {tier.range}
                </div>
              </div>

              <div className="mt-2">
                <div className="text-base font-bold text-foreground leading-none">
                  {formatBRL(tier.price)}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">por unidade</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {next && totalQty > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          key={next.id}
          className="mt-3 flex items-center gap-2 bg-scarcity-bg border border-scarcity-border rounded-lg px-3 py-2.5"
        >
          <span className="text-xs font-medium text-foreground">
            Adicione mais <span className="font-bold">{remaining}</span>{" "}
            {remaining === 1 ? "unidade" : "unidades"} e ganhe{" "}
            <span className="font-bold text-scarcity">{next.discountPct}% OFF</span> em todo o pedido.
          </span>
        </motion.div>
      )}
    </div>
  );
}
