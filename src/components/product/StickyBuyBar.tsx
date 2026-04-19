import { AnimatePresence, motion } from "framer-motion";
import { formatBRL } from "@/data/products";

type Props = {
  visible: boolean;
  totalQty: number;
  unitPrice: number;
  onBuy: () => void;
};

export function StickyBuyBar({ visible, totalQty, unitPrice, onBuy }: Props) {
  const total = totalQty * unitPrice;
  const hasItems = totalQty > 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-border"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex items-center gap-3 px-4 py-3 max-w-screen-xl mx-auto">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                {hasItems ? `${totalQty} ${totalQty === 1 ? "unidade" : "unidades"}` : "Por unidade"}
              </span>
              <span className="text-lg font-bold text-foreground leading-none tabular-nums">
                {formatBRL(hasItems ? total : unitPrice)}
              </span>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onBuy}
              className="ml-auto h-12 px-6 rounded-xl bg-foreground text-primary-foreground font-semibold text-sm flex-1 max-w-[60%]"
            >
              Comprar agora
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
