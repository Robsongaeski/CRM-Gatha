import { Minus, Plus } from "lucide-react";
import { motion } from "framer-motion";

type Props = {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
};

export function QuantityStepper({ label, value, onChange, max = 999 }: Props) {
  const active = value > 0;
  const dec = () => onChange(Math.max(0, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));

  return (
    <div
      className={`flex flex-col items-center justify-between rounded-xl border-2 transition-colors py-2 px-2 h-[88px] ${
        active
          ? "border-foreground bg-foreground/[0.03]"
          : "border-border bg-background hover:border-foreground/30"
      }`}
    >
      <span
        className={`text-xs font-bold tracking-wide ${
          active ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>

      <div className="flex items-center justify-between w-full gap-1">
        <motion.button
          type="button"
          onClick={dec}
          whileTap={{ scale: 0.88 }}
          disabled={value === 0}
          aria-label={`Diminuir ${label}`}
          className="h-8 w-8 rounded-md flex items-center justify-center text-foreground disabled:opacity-25 disabled:cursor-not-allowed hover:bg-muted transition-colors shrink-0"
        >
          <Minus className="h-4 w-4" strokeWidth={2.5} />
        </motion.button>

        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={max}
          value={value}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            onChange(Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0);
          }}
          aria-label={`Quantidade ${label}`}
          className={`w-full min-w-0 h-8 text-center text-base font-bold tabular-nums bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-foreground/20 rounded-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
            active ? "text-foreground" : "text-muted-foreground/50"
          }`}
        />

        <motion.button
          type="button"
          onClick={inc}
          whileTap={{ scale: 0.88 }}
          aria-label={`Aumentar ${label}`}
          className="h-8 w-8 rounded-md flex items-center justify-center text-foreground hover:bg-muted transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
        </motion.button>
      </div>
    </div>
  );
}
