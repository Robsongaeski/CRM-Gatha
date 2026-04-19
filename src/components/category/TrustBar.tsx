import { Factory, Wind, TrendingDown } from "lucide-react";

const items = [
  { icon: Factory, label: "Fabricação Própria" },
  { icon: Wind, label: "Tecnologia Antiodor" },
  { icon: TrendingDown, label: "Descontos no Atacado" },
];

export function TrustBar() {
  return (
    <section className="border-y border-border bg-background" aria-label="Diferenciais da marca">
      <div className="max-w-6xl mx-auto px-5 lg:px-8 py-5 lg:py-7">
        <ul className="grid grid-cols-3 gap-2 lg:gap-8">
          {items.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex flex-col lg:flex-row items-center justify-center gap-2 lg:gap-3 text-center"
            >
              <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-muted/60 shrink-0">
                <Icon className="h-5 w-5 text-foreground" strokeWidth={1.75} />
              </span>
              <span className="text-[11px] lg:text-sm font-medium text-foreground leading-tight">
                {label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
