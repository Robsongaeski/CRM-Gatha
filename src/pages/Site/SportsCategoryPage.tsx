import { useEffect } from "react";
import { AnnouncementBar } from "@/components/product/AnnouncementBar";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { SportsHero } from "@/components/sports/SportsHero";
import { ModalitiesStrip } from "@/components/sports/ModalitiesStrip";
import { SportsTechGrid } from "@/components/sports/SportsTechGrid";
import { InterclassesBanner } from "@/components/sports/InterclassesBanner";
import { SportsShowcase } from "@/components/sports/SportsShowcase";
import { SportsTestimonials } from "@/components/sports/SportsTestimonials";
import { SportsWhatsAppFab } from "@/components/sports/SportsWhatsAppFab";
import { sportProducts } from "@/data/sports";

export default function SportsCategoryPage() {
  useEffect(() => {
    document.title = "Uniformes Esportivos Profissionais | Times e Interclasses";

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
      "Uniformes esportivos sublimados com tecnologia Dry-Fit e proteção UV50+. Pacotes especiais para Interclasses, times de futebol, vôlei e basquete com layout gratuito.",
    );

    const ld = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: sportProducts.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Product",
          name: p.name,
          description: p.tagline,
          image: p.image,
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "BRL",
            lowPrice: p.team20Price,
            highPrice: p.basePrice,
          },
        },
      })),
    };
    const scriptId = "sports-jsonld";
    document.getElementById(scriptId)?.remove();
    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "application/ld+json";
    script.text = JSON.stringify(ld);
    document.head.appendChild(script);

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <GlobalHeader />

      <main>
        <SportsHero />
        <ModalitiesStrip />
        <SportsTechGrid />
        <InterclassesBanner />
        <SportsShowcase />
        <SportsTestimonials />
      </main>

      <footer className="px-4 py-10 text-center bg-background border-t border-border">
        <div className="font-black text-sm tracking-[0.2em] text-foreground">AGROTECH SPORTS</div>
        <p className="text-xs text-muted-foreground mt-2">
          Uniformes esportivos profissionais. Fábrica em Pato Branco · PR.
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

      <SportsWhatsAppFab />
    </div>
  );
}
