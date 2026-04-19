import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { sportProducts } from "@/data/sports";
import { formatBRL } from "@/data/products";
import { ScrollReveal } from "@/components/category/ScrollReveal";

export function SportsShowcase() {
  return (
    <section
      id="vitrine"
      className="bg-background py-16 lg:py-24 scroll-mt-20"
      aria-labelledby="sports-showcase-heading"
    >
      <div className="max-w-6xl mx-auto px-5 lg:px-8">
        <ScrollReveal className="max-w-2xl mb-10 lg:mb-14">
          <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground font-semibold">
            Coleção
          </span>
          <h2
            id="sports-showcase-heading"
            className="mt-3 text-3xl lg:text-5xl font-black tracking-tight text-foreground"
          >
            Modelos para<br className="hidden sm:block" /> seu time.
          </h2>
          <p className="mt-4 text-sm lg:text-base text-muted-foreground">
            Quanto mais peças no pedido, melhor o preço por unidade.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-7">
          {sportProducts.map((product, idx) => (
            <ScrollReveal key={product.slug} delay={idx * 0.1}>
              <Link
                to={`/produto/${product.slug}`}
                className="group block bg-background rounded-2xl overflow-hidden border border-border hover:border-foreground/30 transition-all hover:-translate-y-1 hover:shadow-lg h-full"
              >
                <div className="relative aspect-[4/5] bg-gradient-to-b from-muted/60 to-muted/10 overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    width={1024}
                    height={1280}
                  />
                  <span className="absolute top-4 left-4 inline-flex items-center px-2.5 py-1 rounded-full bg-foreground text-background text-[10px] font-bold uppercase tracking-wider">
                    {product.badge}
                  </span>
                  <span className="absolute top-4 right-4 inline-flex items-center px-2.5 py-1 rounded-full bg-background/90 backdrop-blur text-foreground text-[10px] font-semibold uppercase tracking-wider border border-border">
                    {product.modality}
                  </span>
                </div>

                <div className="p-5 lg:p-6">
                  <h3 className="text-base lg:text-lg font-bold text-foreground tracking-tight leading-snug">
                    {product.name}
                  </h3>
                  <p className="mt-1 text-xs lg:text-sm text-muted-foreground line-clamp-2">
                    {product.tagline}
                  </p>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-muted-foreground">unid.</span>
                      <span className="text-sm text-muted-foreground line-through tabular-nums">
                        {formatBRL(product.basePrice)}
                      </span>
                    </div>

                    <div className="rounded-xl bg-price-deal-bg px-3 py-2.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-price-deal">
                          Kit 10+
                        </span>
                        <span className="text-base font-black text-price-deal tabular-nums">
                          {formatBRL(product.team10Price)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-baseline justify-between gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-price-deal">
                          Kit Equipe 20+
                        </span>
                        <span className="text-lg font-black text-price-deal tabular-nums">
                          {formatBRL(product.team20Price)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 inline-flex items-center justify-center w-full h-12 rounded-full border-2 border-foreground text-foreground font-semibold text-sm group-hover:bg-foreground group-hover:text-background transition-all">
                    Personalizar e Orçar
                    <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
