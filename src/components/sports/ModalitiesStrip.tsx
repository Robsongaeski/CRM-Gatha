import { motion } from "framer-motion";
import {
  Trophy,
  Dumbbell,
  type LucideIcon,
} from "lucide-react";
import { modalities } from "@/data/sports";

// Inline SVG icons for sports not in lucide
const SoccerIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2l3 4-1 5-4 1-3-4 1-4z M21 8l-3 3 1 4 4 1 M3 8l3 3-1 4-4 1 M12 22l-2-4 2-3 4 1 1 4z" />
  </svg>
);
const VolleyballIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 M2 12c4-2 14-2 20 0 M5 5c4 4 10 8 14 14 M19 5c-4 4-10 8-14 14" />
  </svg>
);
const BasketballIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20 M12 2v20 M5 5c3 3 11 11 14 14 M19 5c-3 3-11 11-14 14" />
  </svg>
);
const TennisIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M3 7c4 1.5 10 6 14 14 M21 7c-4 1.5-10 6-14 14" />
  </svg>
);

const iconMap: Record<string, LucideIcon | React.FC<React.SVGProps<SVGSVGElement>>> = {
  soccer: SoccerIcon,
  volleyball: VolleyballIcon,
  basketball: BasketballIcon,
  tennis: TennisIcon,
  trophy: Trophy,
  dumbbell: Dumbbell,
};

export function ModalitiesStrip() {
  return (
    <section className="bg-background py-10 lg:py-14" aria-labelledby="modalidades-heading">
      <div className="max-w-6xl mx-auto px-5 lg:px-8">
        <div className="flex items-end justify-between mb-5 lg:mb-7">
          <div>
            <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground font-semibold">
              Modalidades
            </span>
            <h2
              id="modalidades-heading"
              className="mt-2 text-xl lg:text-2xl font-black tracking-tight text-foreground"
            >
              Para todos os esportes.
            </h2>
          </div>
        </div>

        <div className="-mx-5 lg:mx-0 overflow-x-auto no-scrollbar">
          <ul className="flex gap-3 px-5 lg:px-0 lg:justify-between lg:flex-wrap">
            {modalities.map((m, idx) => {
              const Icon = iconMap[m.icon];
              return (
                <motion.li
                  key={m.key}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  className="shrink-0"
                >
                  <button
                    type="button"
                    className="group flex flex-col items-center gap-2 min-w-[88px] focus:outline-none"
                    aria-label={m.label}
                  >
                    <span className="inline-flex items-center justify-center h-16 w-16 lg:h-20 lg:w-20 rounded-full bg-surface-soft group-hover:bg-foreground group-hover:text-background transition-all duration-300 group-hover:-translate-y-0.5">
                      <Icon className="h-7 w-7 lg:h-8 lg:w-8" />
                    </span>
                    <span className="text-xs lg:text-sm font-semibold text-foreground">
                      {m.label}
                    </span>
                  </button>
                </motion.li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
