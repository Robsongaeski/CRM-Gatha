import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  Wind,
  ShieldCheck,
  Scissors,
  Palette,
  Factory,
  Zap,
  Award,
  Sparkles,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { AnnouncementBar } from "@/components/product/AnnouncementBar";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { ScrollReveal } from "@/components/category/ScrollReveal";
import { products as allProducts, formatBRL, type Product } from "@/data/products";
import type { CategoryConfig } from "@/data/categories";

const iconMap: Record<string, LucideIcon> = {
  wind: Wind,
  shield: ShieldCheck,
  scissors: Scissors,
  palette: Palette,
  factory: Factory,
  zap: Zap,
  award: Award,
  sparkles: Sparkles,
};

type Props = { category: CategoryConfig };

export function CategoryLandingTemplate({ category }: Props) {
  useEffect(() => {
    document.title = `${category.name} | Uniformes Personalizados`;
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    setMeta("description", category.hero.description.slice(0, 160));

    // JSON-LD ItemList from real product slugs
    const products = category.productSlugs
      .map((s) => allProducts.find((p) => p.slug === s))
      .filter((p): p is Product => Boolean(p));

    const ld = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: products.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Product",
          name: p.name,
          description: p.tagline,
          image: p.images[0]?.src,
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "BRL",
            lowPrice: p.tiers[p.tiers.length - 1]?.price ?? p.basePrice,
            highPrice: p.basePrice,
          },
        },
      })),
    };
    const scriptId = `category-jsonld-${category.slug}`;
    document.getElementById(scriptId)?.remove();
    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "application/ld+json";
    script.text = JSON.stringify(ld);
    document.head.appendChild(script);

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [category]);

  const products = category.productSlugs
    .map((s) => allProducts.find((p) => p.slug === s))
    .filter((p): p is Product => Boolean(p));

  const scrollToCollection = () => {
    document.getElementById("colecao")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const waLink = `https://wa.me/${category.whatsappNumber}?text=${encodeURIComponent(category.whatsappMessage)}`;

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <GlobalHeader />

      <main>
        {/* HERO */}
        <section
          className="relative min-h-[88vh] lg:min-h-screen w-full overflow-hidden flex items-end"
          aria-label={category.name}
        >
          <div className="absolute inset-0">
            <img
              src={category.hero.image}
              alt={category.name}
              className="h-full w-full object-cover"
              width={1920}
              height={1080}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/85" />
          </div>

          <div className="relative z-10 w-full max-w-6xl mx-auto px-5 lg:px-8 pb-16 lg:pb-24 pt-28">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-3xl"
            >
              <span className="inline-block text-[11px] uppercase tracking-[0.25em] text-white/80 font-semibold mb-5">
                {category.hero.eyebrow}
              </span>
              <h1 className="text-white text-[2.5rem] leading-[0.95] sm:text-6xl lg:text-7xl font-black tracking-tight">
                {category.hero.title}
                {category.hero.titleAlt && (
                  <>
                    <br />
                    {category.hero.titleAlt}
                  </>
                )}
              </h1>
              <p className="text-white/85 text-base lg:text-xl mt-6 max-w-xl leading-relaxed">
                {category.hero.description}
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={scrollToCollection}
                  className="group inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full bg-white text-foreground font-semibold text-base hover:bg-white/90 transition-all hover:gap-3"
                >
                  {category.hero.primaryCtaLabel}
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </motion.div>
          </div>

          <motion.div
            className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 text-white/70"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          >
            <ChevronDown className="h-6 w-6" />
          </motion.div>
        </section>

        {/* TECH GRID */}
        <section className="bg-background py-16 lg:py-24">
          <div className="max-w-6xl mx-auto px-5 lg:px-8">
            <ScrollReveal className="text-center max-w-2xl mx-auto mb-10 lg:mb-14">
              <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground font-semibold">
                Tecnologia
              </span>
              <h2 className="mt-3 text-3xl lg:text-5xl font-black tracking-tight text-foreground">
                Cada detalhe pensado<br className="hidden sm:block" /> para resistir.
              </h2>
            </ScrollReveal>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
              {category.tech.map((feature, idx) => {
                const Icon = iconMap[feature.icon] ?? Sparkles;
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

        {/* B2B CALLOUT */}
        <section className="bg-foreground text-background py-16 lg:py-24">
          <div className="max-w-6xl mx-auto px-5 lg:px-8 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <ScrollReveal>
              <span className="text-[11px] uppercase tracking-[0.25em] text-background/70 font-semibold">
                {category.b2b.eyebrow}
              </span>
              <h2 className="mt-3 text-3xl lg:text-5xl font-black tracking-tight">
                {category.b2b.title}
              </h2>
              <p className="mt-5 text-base lg:text-lg text-background/80 leading-relaxed max-w-lg">
                {category.b2b.description}
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.15}>
              <ul className="space-y-3 mb-8">
                {category.b2b.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-background/90">
                    <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-background/80" />
                    <span className="text-sm lg:text-base">{b}</span>
                  </li>
                ))}
              </ul>
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-2 h-14 px-7 rounded-full bg-background text-foreground font-semibold text-base hover:bg-background/90 transition-all hover:gap-3"
              >
                <MessageCircle className="h-5 w-5" strokeWidth={1.75} />
                {category.b2b.ctaLabel}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </a>
            </ScrollReveal>
          </div>
        </section>

        {/* SHOWCASE */}
        <section
          id="colecao"
          className="bg-background py-16 lg:py-24 scroll-mt-20"
          aria-labelledby="showcase-heading"
        >
          <div className="max-w-6xl mx-auto px-5 lg:px-8">
            <ScrollReveal className="max-w-2xl mb-10 lg:mb-14">
              <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground font-semibold">
                Coleção
              </span>
              <h2
                id="showcase-heading"
                className="mt-3 text-3xl lg:text-5xl font-black tracking-tight text-foreground"
              >
                Modelos disponíveis.
              </h2>
              <p className="mt-4 text-sm lg:text-base text-muted-foreground">
                Quanto mais peças no pedido, melhor o preço por unidade.
              </p>
            </ScrollReveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-7">
              {products.map((product, idx) => {
                const lastTier = product.tiers[product.tiers.length - 1];
                const recommended = product.tiers.find((t) => t.recommended) ?? product.tiers[1] ?? product.tiers[0];
                return (
                  <ScrollReveal key={product.slug} delay={idx * 0.1}>
                    <Link
                      to={`/produto/${product.slug}`}
                      className="group block bg-background rounded-2xl overflow-hidden border border-border hover:border-foreground/30 transition-all hover:-translate-y-1 hover:shadow-lg h-full"
                    >
                      <div className="relative aspect-[4/5] bg-gradient-to-b from-muted/60 to-muted/10 overflow-hidden">
                        <img
                          src={product.images[0].src}
                          alt={product.images[0].alt}
                          className="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                          width={1024}
                          height={1280}
                        />
                      </div>

                      <div className="p-5 lg:p-6">
                        <h3 className="text-base lg:text-lg font-bold text-foreground tracking-tight leading-snug">
                          {product.shortName}
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
                                {recommended.label}
                              </span>
                              <span className="text-base font-black text-price-deal tabular-nums">
                                {formatBRL(recommended.price)}
                              </span>
                            </div>
                            {lastTier && lastTier.id !== recommended.id && (
                              <div className="mt-1 flex items-baseline justify-between gap-2">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-price-deal">
                                  {lastTier.label}
                                </span>
                                <span className="text-lg font-black text-price-deal tabular-nums">
                                  {formatBRL(lastTier.price)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-6 inline-flex items-center justify-center w-full h-12 rounded-full border-2 border-foreground text-foreground font-semibold text-sm group-hover:bg-foreground group-hover:text-background transition-all">
                          Personalizar e Orçar
                          <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    </Link>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="bg-surface-soft py-16 lg:py-24">
          <div className="max-w-6xl mx-auto px-5 lg:px-8">
            <ScrollReveal className="max-w-2xl mb-10">
              <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground font-semibold">
                Quem usa, recomenda
              </span>
              <h2 className="mt-3 text-3xl lg:text-5xl font-black tracking-tight text-foreground">
                Nossos clientes.
              </h2>
            </ScrollReveal>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {category.testimonials.map((t, idx) => (
                <ScrollReveal key={t.id} delay={idx * 0.08}>
                  <blockquote className="h-full bg-background rounded-2xl p-6 border border-border">
                    <p className="text-sm lg:text-base text-foreground leading-relaxed">"{t.quote}"</p>
                    <footer className="mt-5 pt-4 border-t border-border">
                      <p className="text-sm font-bold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.role}</p>
                    </footer>
                  </blockquote>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="px-4 py-10 text-center bg-background border-t border-border">
        <Link to="/" className="font-black text-sm tracking-[0.2em] text-foreground inline-block">
          AGROTECH
        </Link>
        <p className="text-xs text-muted-foreground mt-2">
          Uniformes profissionais. Fábrica em Pato Branco · PR.
        </p>
        <div className="flex items-center justify-center gap-4 mt-5 text-[10px] uppercase tracking-wider text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">Trocas</a>
          <span>·</span>
          <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
          <span>·</span>
          <a href="#" className="hover:text-foreground transition-colors">Contato</a>
        </div>
        <p className="text-[10px] text-muted-foreground mt-6">
          Pagamento seguro · Pix · Cartão · Boleto
        </p>
      </footer>

      {/* Floating WhatsApp */}
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 h-14 px-5 rounded-full bg-foreground text-background shadow-lg hover:scale-105 transition-transform"
        aria-label={`Falar com ${category.consultantTitle}`}
      >
        <MessageCircle className="h-5 w-5" strokeWidth={2} />
        <span className="hidden sm:inline text-sm font-semibold">{category.consultantTitle}</span>
      </a>
    </div>
  );
}
