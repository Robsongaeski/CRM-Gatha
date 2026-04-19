import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Product } from "@/data/products";
import { getTierForQty } from "@/data/products";
import { AnnouncementBar } from "@/components/product/AnnouncementBar";
import { ProductHeader } from "@/components/product/ProductHeader";
import { ProductGallery } from "@/components/product/ProductGallery";
import { BuyBox } from "@/components/product/BuyBox";
import { ProductAccordion } from "@/components/product/ProductAccordion";
import { ReviewsGrid } from "@/components/product/ReviewsGrid";
import { StickyBuyBar } from "@/components/product/StickyBuyBar";
import { useScrollPast } from "@/hooks/useScrollPast";

type Props = { product: Product };

export default function ProductPage({ product }: Props) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [showKids, setShowKids] = useState(false);

  const ctaRef = useRef<HTMLDivElement>(null);
  const showStickyBar = useScrollPast(ctaRef);

  const totalQty = useMemo(
    () => Object.values(quantities).reduce((sum, n) => sum + (n || 0), 0),
    [quantities],
  );
  const tier = useMemo(() => getTierForQty(product.tiers, totalQty), [product.tiers, totalQty]);

  const handleQuantityChange = (key: string, qty: number) => {
    setQuantities((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[key];
      else next[key] = qty;
      return next;
    });
  };

  const handleStickyBuy = () => {
    if (totalQty === 0) {
      toast.error("Escolha pelo menos um tamanho", {
        description: "Role para cima e selecione as quantidades.",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    toast.success("Pedido enviado para checkout", {
      description: `${totalQty} ${totalQty === 1 ? "unidade" : "unidades"} · ${tier.label}`,
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-0">
      <AnnouncementBar />
      <ProductHeader />

      <main className="max-w-7xl mx-auto">
        {/* Product hero: gallery + buy box */}
        <div className="lg:grid lg:grid-cols-[1.2fr_1fr] xl:grid-cols-[1.3fr_1fr] lg:gap-10 lg:px-8 lg:pt-6">
          <div className="lg:sticky lg:top-20 lg:self-start">
            <ProductGallery images={product.images} />
          </div>

          <BuyBox
            ref={ctaRef}
            product={product}
            quantities={quantities}
            onQuantityChange={handleQuantityChange}
            showKids={showKids}
            onShowKidsChange={setShowKids}
          />
        </div>

        <section className="px-4 lg:px-8 pt-2 pb-6 bg-background max-w-3xl lg:mx-auto">
          <ProductAccordion product={product} />
        </section>

        <ReviewsGrid
          reviews={product.reviews}
          rating={product.rating}
          reviewCount={product.reviewCount}
        />

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
      </main>

      <StickyBuyBar
        visible={showStickyBar}
        totalQty={totalQty}
        unitPrice={tier.price}
        onBuy={handleStickyBuy}
      />
    </div>
  );
}
