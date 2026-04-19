import { MessageCircle } from "lucide-react";
import { WHATSAPP_NUMBER } from "@/data/category";
import { ScrollReveal } from "./ScrollReveal";

export function B2BCallout() {
  const message = encodeURIComponent(
    "Olá! Quero um orçamento personalizado para minha equipe.",
  );
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;

  return (
    <section className="bg-background pb-16 lg:pb-24" aria-labelledby="b2b-heading">
      <div className="max-w-6xl mx-auto px-5 lg:px-8">
        <ScrollReveal>
          <div className="bg-foreground text-background rounded-3xl px-6 py-12 lg:px-16 lg:py-20 text-center lg:text-left lg:flex lg:items-center lg:justify-between lg:gap-10">
            <div className="max-w-2xl lg:max-w-xl mx-auto lg:mx-0">
              <span className="text-[11px] uppercase tracking-[0.25em] text-background/70 font-semibold">
                Atacado · B2B
              </span>
              <h2
                id="b2b-heading"
                className="mt-3 text-3xl lg:text-4xl xl:text-5xl font-black tracking-tight"
              >
                Precisa vestir uma equipe grande?
              </h2>
              <p className="mt-4 text-sm lg:text-base text-background/80 leading-relaxed">
                Faça um orçamento personalizado com nossa equipe. Atendimento direto pelo WhatsApp em
                até 1h em horário comercial.
              </p>
            </div>

            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 lg:mt-0 inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full bg-[#25D366] hover:bg-[#1faa54] text-white font-semibold text-base transition-colors shrink-0"
            >
              <MessageCircle className="h-5 w-5" strokeWidth={2} />
              Falar com Atendente
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
