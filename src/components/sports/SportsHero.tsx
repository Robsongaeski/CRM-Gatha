import { motion } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import sportsHero from "@/assets/site/sports-hero.jpg";

import { SPORTS_HERO_VIDEO_URL } from "@/data/sports";

export function SportsHero() {
  const scrollToCollection = () => {
    document.getElementById("vitrine")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section
      className="relative min-h-[88vh] lg:min-h-screen w-full overflow-hidden flex items-end"
      aria-label="Uniformes esportivos profissionais"
    >
      <div className="absolute inset-0">
        {SPORTS_HERO_VIDEO_URL ? (
          <video
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster={sportsHero}
          >
            <source src={SPORTS_HERO_VIDEO_URL} type="video/mp4" />
          </video>
        ) : (
          <img
            src={sportsHero}
            alt="Atleta de futebol em movimento ao pôr do sol vestindo uniforme profissional"
            className="h-full w-full object-cover"
            width={1920}
            height={1080}
          />
        )}
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
            Coleção Esportiva · 2025
          </span>
          <h1 className="text-white text-[2.5rem] leading-[0.95] sm:text-6xl lg:text-7xl font-black tracking-tight">
            Vista a garra<br />do seu time.
          </h1>
          <p className="text-white/85 text-base lg:text-xl mt-6 max-w-xl leading-relaxed">
            Uniformes de alta performance com tecnologia Dry-Fit e proteção UV50+. Do interclasses ao
            profissional.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={scrollToCollection}
              className="group inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full bg-white text-foreground font-semibold text-base hover:bg-white/90 transition-all hover:gap-3"
            >
              Ver Modelos e Preços
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
  );
}
