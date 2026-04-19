import { useEffect } from "react";
import { AnnouncementBar } from "@/components/product/AnnouncementBar";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { HeroSection } from "@/components/category/HeroSection";
import { TrustBar } from "@/components/category/TrustBar";
import { TechGrid } from "@/components/category/TechGrid";
import { SocialProofCarousel } from "@/components/category/SocialProofCarousel";
import { ProductShowcase } from "@/components/category/ProductShowcase";
import { B2BCallout } from "@/components/category/B2BCallout";
import { FloatingWhatsApp } from "@/components/category/FloatingWhatsApp";
import { categoryProducts } from "@/data/category";

export default function CategoryPage() {
  useEffect(() => {
    document.title = "Camisetas Tecnológicas para o Agro | UV50+ Personalizadas";

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
      "Camisetas e uniformes técnicos para o agro com tecnologia UV50+, dry-fit e antiodor. Personalize com sua logo e ganhe descontos progressivos no atacado.",
    );

    // JSON-LD ItemList
    const ld = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: categoryProducts.map((p, i) => ({
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
            lowPrice: p.fromPrice,
            highPrice: p.basePrice,
          },
        },
      })),
    };
    const scriptId = "category-jsonld";
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
        <HeroSection />
        <TrustBar />
        <TechGrid />
        <SocialProofCarousel />
        <ProductShowcase />
        <B2BCallout />
      </main>

      <footer className="px-4 py-10 text-center bg-background border-t border-border">
        <div className="font-black text-sm tracking-[0.2em] text-foreground">AGROTECH</div>
        <p className="text-xs text-muted-foreground mt-2">
          Tecnologia têxtil para quem trabalha de verdade.
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

      <FloatingWhatsApp />
    </div>
  );
}
