import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { AnnouncementBar } from "@/components/product/AnnouncementBar";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { categories } from "@/data/categories";
import homeHero from "@/assets/site/home-hub-hero.jpg";

const accentClass: Record<string, string> = {
  neutral: "bg-foreground/80",
  warm: "bg-amber-500",
  cool: "bg-sky-500",
  lime: "bg-lime-500",
  amber: "bg-orange-500",
  rose: "bg-rose-500",
};

export default function HomePage() {
  useEffect(() => {
    document.title = "AgroTech | Uniformes Personalizados para todos os segmentos";
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    setMeta(
      "description",
      "Fábrica de uniformes personalizados para Agro, Esporte, Empresas, Indústria, Terceirão e Corrida. Tecnologia, prazo e atendimento direto.",
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <GlobalHeader />

      <main>
        {/* HERO MINIMAL */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 -z-10">
            <img
              src={homeHero}
              alt="Coleção de uniformes em showroom"
              className="h-full w-full object-cover opacity-30"
              width={1920}
              height={1080}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
          </div>

          <div className="max-w-6xl mx-auto px-5 lg:px-8 pt-20 pb-16 lg:pt-28 lg:pb-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-3xl"
            >
              <span className="inline-block text-[11px] uppercase tracking-[0.25em] text-muted-foreground font-semibold mb-5">
                Fábrica · Pato Branco / PR
              </span>
              <h1 className="text-foreground text-[2.5rem] leading-[0.95] sm:text-6xl lg:text-7xl font-black tracking-tight">
                Uniformes feitos<br />sob medida.
              </h1>
              <p className="text-muted-foreground text-base lg:text-xl mt-6 max-w-xl leading-relaxed">
                Tecnologia, durabilidade e atendimento consultivo direto da nossa fábrica para o seu time, empresa ou turma.
              </p>
            </motion.div>
          </div>
        </section>

        {/* CATEGORIAS GRID */}
        <section className="py-14 lg:py-20 max-w-6xl mx-auto px-5 lg:px-8">
          <div className="mb-8 lg:mb-12">
            <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground font-semibold">
              Categorias
            </span>
            <h2 className="mt-2 text-2xl lg:text-3xl font-black tracking-tight text-foreground">
              Escolha o seu segmento.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {categories.map((c, idx) => (
              <motion.div
                key={c.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: idx * 0.06 }}
              >
                <Link
                  to={c.routePath ?? `/categoria/${c.slug}`}
                  className="group relative block aspect-[4/5] rounded-2xl overflow-hidden bg-muted border border-border hover:border-foreground/30 transition-all hover:-translate-y-1 hover:shadow-xl"
                >
                  <img
                    src={c.hero.image}
                    alt={c.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                    width={1920}
                    height={1080}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                  <div className="absolute inset-0 p-5 lg:p-6 flex flex-col justify-end text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${accentClass[c.accent]}`} />
                      <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-white/80">
                        {c.shortName}
                      </span>
                    </div>
                    <h3 className="text-2xl lg:text-3xl font-black tracking-tight leading-tight">
                      {c.name}
                    </h3>
                    <p className="mt-2 text-sm text-white/80 line-clamp-2">{c.hubTagline}</p>
                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold group-hover:gap-3 transition-all">
                      Ver coleção
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      <footer className="px-4 py-10 text-center bg-background border-t border-border">
        <div className="font-black text-sm tracking-[0.2em] text-foreground">AGROTECH</div>
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
      </footer>
    </div>
  );
}
