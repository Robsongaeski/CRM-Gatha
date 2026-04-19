import { AnimatePresence, motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { QuantityStepper } from "./QuantityStepper";
import { SizeGuideDialog } from "./SizeGuideDialog";

type Props = {
  adultSizes: string[];
  kidsSizes: string[];
  quantities: Record<string, number>;
  onChange: (key: string, qty: number) => void;
  showKids: boolean;
  onToggleKids: (v: boolean) => void;
};

export const adultKey = (s: string) => `adult-${s}`;
export const kidsKey = (s: string) => `kids-${s}`;

export function SizeQuantityGrid({
  adultSizes,
  kidsSizes,
  quantities,
  onChange,
  showKids,
  onToggleKids,
}: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Tamanhos & Quantidades</h3>
        <SizeGuideDialog />
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        Monte seu pedido escolhendo quantas unidades de cada tamanho.
      </p>

      {/* Adult sizes */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {adultSizes.map((s) => (
          <QuantityStepper
            key={s}
            label={s}
            value={quantities[adultKey(s)] ?? 0}
            onChange={(v) => onChange(adultKey(s), v)}
          />
        ))}
      </div>

      {/* Kids toggle — discreto */}
      <button
        type="button"
        onClick={() => onToggleKids(!showKids)}
        className="mt-3 flex items-center justify-between w-full px-1 py-2 text-left group"
      >
        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
          + Incluir tamanhos infantis (2 a 14 anos)
        </span>
        <Switch
          checked={showKids}
          onCheckedChange={onToggleKids}
          aria-label="Incluir tamanhos infantis"
          className="scale-75 origin-right"
        />
      </button>

      <AnimatePresence initial={false}>
        {showKids && (
          <motion.div
            key="kids"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="pt-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                Infantil (anos)
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {kidsSizes.map((s) => (
                  <QuantityStepper
                    key={s}
                    label={`${s}a`}
                    value={quantities[kidsKey(s)] ?? 0}
                    onChange={(v) => onChange(kidsKey(s), v)}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
