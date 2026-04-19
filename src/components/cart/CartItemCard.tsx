import { motion } from "framer-motion";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart, type CartItem } from "@/contexts/CartContext";
import { formatBRL, products, getTierForQty } from "@/data/products";

type Props = { item: CartItem };

export function CartItemCard({ item }: Props) {
  const { updateQty, removeItem, totalQty } = useCart();

  const refProduct = products[0];
  const tier = getTierForQty(refProduct.tiers, Math.max(1, totalQty));
  const lineTotal = item.qty * tier.price;
  const lineBase = item.qty * refProduct.basePrice;
  const hasDiscount = tier.discountPct > 0;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="flex gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border border-border bg-card"
    >
      <div className="aspect-square w-20 sm:w-24 rounded-xl overflow-hidden bg-muted shrink-0">
        <img
          src={item.productImage}
          alt={item.productName}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
              {item.productName}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tamanho: <span className="font-medium text-foreground">{item.sizeLabel}</span>
            </p>
            {item.customization?.positions && item.customization.positions.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                Logo: {item.customization.positions.join(" + ").toLowerCase()}
              </p>
            )}
            {item.customization?.team && (
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                Time: {item.customization.team.teamName || "personalizado"}
                {item.customization.team.roster?.length
                  ? ` · ${item.customization.team.roster.length} atletas`
                  : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => removeItem(item.id)}
            aria-label={`Remover ${item.productName} ${item.sizeLabel}`}
            className="text-muted-foreground hover:text-destructive transition-colors p-1 -mr-1 -mt-1 shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-auto pt-2 flex items-end justify-between gap-3">
          <div className="inline-flex items-center rounded-full border border-border bg-background h-9">
            <button
              type="button"
              onClick={() => updateQty(item.id, item.qty - 1)}
              aria-label="Diminuir"
              className="h-9 w-9 inline-flex items-center justify-center text-foreground hover:bg-muted rounded-l-full transition-colors"
            >
              <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
            <span className="min-w-[2ch] text-center text-sm font-bold tabular-nums px-1">
              {item.qty}
            </span>
            <button
              type="button"
              onClick={() => updateQty(item.id, item.qty + 1)}
              aria-label="Aumentar"
              className="h-9 w-9 inline-flex items-center justify-center text-foreground hover:bg-muted rounded-r-full transition-colors"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          </div>

          <motion.div
            key={lineTotal}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="text-right"
          >
            {hasDiscount && (
              <span className="block text-[11px] text-muted-foreground line-through tabular-nums">
                {formatBRL(lineBase)}
              </span>
            )}
            <span
              className={`block text-base font-extrabold tabular-nums ${
                hasDiscount ? "text-price-deal" : "text-foreground"
              }`}
            >
              {formatBRL(lineTotal)}
            </span>
          </motion.div>
        </div>
      </div>
    </motion.article>
  );
}
