import { Sun, Zap, Wind, Sparkles, type LucideIcon } from "lucide-react";
import type { Product } from "@/data/products";

const iconMap: Record<Product["trustBadges"][number]["icon"], LucideIcon> = {
  uv: Sun,
  dryfit: Zap,
  antiodor: Wind,
  print: Sparkles,
};

type Props = { badges: Product["trustBadges"] };

export function TrustBadges({ badges }: Props) {
  return (
    <div className="grid grid-cols-4 gap-2 py-5 border-y border-border">
      {badges.map((b) => {
        const Icon = iconMap[b.icon];
        return (
          <div key={b.label} className="flex flex-col items-center text-center gap-1.5">
            <Icon className="h-5 w-5 text-foreground" strokeWidth={1.75} />
            <span className="text-[10px] font-semibold leading-tight text-foreground">
              {b.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
