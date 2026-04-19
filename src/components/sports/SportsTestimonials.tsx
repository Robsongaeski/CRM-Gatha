import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Quote } from "lucide-react";
import { sportTestimonials } from "@/data/sports";
import { ScrollReveal } from "@/components/category/ScrollReveal";

export function SportsTestimonials() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % sportTestimonials.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  const t = sportTestimonials[index];

  return (
    <section className="bg-background py-16 lg:py-24" aria-labelledby="depo-heading">
      <div className="max-w-4xl mx-auto px-5 lg:px-8">
        <ScrollReveal className="text-center mb-10">
          <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground font-semibold">
            Depoimentos
          </span>
          <h2
            id="depo-heading"
            className="mt-3 text-3xl lg:text-5xl font-black tracking-tight text-foreground"
          >
            Quem joga,<br className="hidden sm:block" /> recomenda.
          </h2>
        </ScrollReveal>

        <ScrollReveal>
          <div className="relative bg-surface-soft rounded-3xl px-6 py-10 lg:p-14 min-h-[260px] flex flex-col items-center justify-center text-center">
            <Quote className="h-8 w-8 text-foreground/20 mb-4" />
            <AnimatePresence mode="wait">
              <motion.blockquote
                key={t.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-2xl"
              >
                <p className="text-lg lg:text-2xl font-medium text-foreground leading-snug tracking-tight">
                  "{t.quote}"
                </p>
                <footer className="mt-6">
                  <div className="text-sm font-bold text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t.role}</div>
                </footer>
              </motion.blockquote>
            </AnimatePresence>

            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
              {sportTestimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Depoimento ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? "w-6 bg-foreground" : "w-1.5 bg-foreground/25"
                  }`}
                />
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
