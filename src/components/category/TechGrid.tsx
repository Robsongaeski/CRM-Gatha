import { Sun, Droplets, Sparkles, Scissors, type LucideIcon } from "lucide-react";
import { techFeatures } from "@/data/category";
import { ScrollReveal } from "./ScrollReveal";

const iconMap: Record<string, LucideIcon> = {
  sun: Sun,
  droplets: Droplets,
  sparkles: Sparkles,
  scissors: Scissors,
};

export function TechGrid() {
  return (
    <section className="bg-background py-16 lg:py-24" aria-labelledby="tech-heading">
      <div className="max-w-6xl mx-auto px-5 lg:px-8">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-10 lg:mb-14">
          <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground font-semibold">
            Tecnologia
          </span>
          <h2
            id="tech-heading"
            className="mt-3 text-3xl lg:text-5xl font-black tracking-tight text-foreground"
          >
            Engenharia em cada fio.
          </h2>
          <p className="mt-4 text-sm lg:text-base text-muted-foreground">
            Pesquisamos, testamos e refinamos cada detalhe para que sua equipe trabalhe melhor.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
          {techFeatures.map((feature, idx) => {
            const Icon = iconMap[feature.icon];
            return (
              <ScrollReveal key={feature.title} delay={idx * 0.08}>
                <div className="group h-full bg-surface-soft hover:bg-surface-soft-hover rounded-2xl p-5 lg:p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                  <span className="inline-flex items-center justify-center h-11 w-11 lg:h-12 lg:w-12 rounded-xl bg-white shadow-sm">
                    <Icon className="h-5 w-5 lg:h-6 lg:w-6 text-foreground" strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-5 text-base lg:text-lg font-bold text-foreground tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-xs lg:text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
