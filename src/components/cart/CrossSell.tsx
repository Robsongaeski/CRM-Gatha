import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import productMc from "@/assets/site/product-mc.jpg";
import productPolo from "@/assets/site/product-polo.jpg";
import productDetail from "@/assets/site/product-detail.jpg";
import { formatBRL } from "@/data/products";
import { toast } from "sonner";

const items = [
  { id: "mc", name: "AgroTech Manga Curta", from: 69.93, image: productMc },
  { id: "polo", name: "AgroTech Polo Equipe", from: 97.93, image: productPolo },
  { id: "cap", name: "Boné Trucker AgroTech", from: 49.9, image: productDetail },
];

export function CrossSell() {
  return (
    <section aria-label="Aproveite também" className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-bold text-foreground">Aproveite também</h2>
        <span className="text-xs text-muted-foreground">Combine com seu pedido</span>
      </div>

      <div className="-mx-4 sm:mx-0 overflow-x-auto no-scrollbar">
        <ul className="flex gap-3 px-4 sm:px-0 snap-x snap-mandatory">
          {items.map((it) => (
            <li
              key={it.id}
              className="snap-start shrink-0 w-[160px] sm:w-[180px] rounded-2xl border border-border bg-card overflow-hidden"
            >
              <div className="aspect-square bg-muted overflow-hidden">
                <img
                  src={it.image}
                  alt={it.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-3 space-y-1.5">
                <h3 className="text-xs font-semibold text-foreground leading-snug line-clamp-2 min-h-[2lh]">
                  {it.name}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  A partir de{" "}
                  <span className="font-bold text-foreground tabular-nums">{formatBRL(it.from)}</span>
                </p>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() =>
                    toast.info("Em breve", { description: `${it.name} chega na próxima coleção.` })
                  }
                  className="mt-1 inline-flex items-center justify-center gap-1 w-full h-9 rounded-full border border-foreground text-foreground text-xs font-semibold hover:bg-foreground hover:text-primary-foreground transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Adicionar
                </motion.button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
