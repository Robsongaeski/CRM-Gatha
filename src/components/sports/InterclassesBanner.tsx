import { MessageCircle, Sparkles, Users, Tag } from "lucide-react";
import { SPORTS_WHATSAPP_NUMBER } from "@/data/sports";
import { ScrollReveal } from "@/components/category/ScrollReveal";

export function InterclassesBanner() {
  const message = encodeURIComponent(
    "Olá! Quero um orçamento de uniformes para o Interclasses da minha escola/faculdade.",
  );
  const href = `https://wa.me/${SPORTS_WHATSAPP_NUMBER}?text=${message}`;

  return (
    <section className="bg-surface-soft py-16 lg:py-24" aria-labelledby="interclasses-heading">
      <div className="max-w-6xl mx-auto px-5 lg:px-8">
        <ScrollReveal>
          <div className="bg-background rounded-3xl border border-border p-6 lg:p-12 lg:flex lg:items-center lg:gap-10">
            <div className="flex-1">
              <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-muted-foreground font-semibold">
                <Sparkles className="h-3.5 w-3.5" /> Especial · Interclasses & Equipes
              </span>
              <h2
                id="interclasses-heading"
                className="mt-3 text-3xl lg:text-4xl xl:text-5xl font-black tracking-tight text-foreground"
              >
                Organizando o<br className="hidden sm:block" /> Interclasses?
              </h2>
              <p className="mt-4 text-sm lg:text-base text-muted-foreground leading-relaxed max-w-xl">
                Pacotes especiais com <strong className="text-foreground">montagem de layout gratuita</strong> e
                <strong className="text-foreground"> descontos progressivos</strong> para grandes turmas.
                Atendimento direto com nosso consultor.
              </p>

              <ul className="mt-6 grid sm:grid-cols-2 gap-3 max-w-xl">
                <li className="flex items-start gap-3">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-soft">
                    <Users className="h-4 w-4 text-foreground" />
                  </span>
                  <span className="text-sm text-foreground">
                    Layout gratuito por turma
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-soft">
                    <Tag className="h-4 w-4 text-foreground" />
                  </span>
                  <span className="text-sm text-foreground">
                    Desconto progressivo de equipe
                  </span>
                </li>
              </ul>

              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full bg-[#25D366] hover:bg-[#1faa54] text-white font-semibold text-base transition-colors"
              >
                <MessageCircle className="h-5 w-5" strokeWidth={2} />
                Falar com Consultor de Uniformes
              </a>
            </div>

            <div className="hidden lg:block flex-1">
              <div className="relative aspect-square rounded-2xl bg-gradient-to-br from-foreground to-brand-soft overflow-hidden flex items-center justify-center">
                <div className="text-center text-background px-6">
                  <div className="text-6xl xl:text-7xl font-black tabular-nums">-30%</div>
                  <p className="mt-3 text-sm uppercase tracking-[0.2em] text-background/80">
                    em pedidos a partir de 20 peças
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
