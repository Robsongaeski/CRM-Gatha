import { forwardRef, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Flame, ShoppingBag, Star } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { Product } from "@/data/products";
import { formatBRL, getTierForQty } from "@/data/products";
import { useCart } from "@/contexts/CartContext";
import { VolumePricing } from "./VolumePricing";
import { SizeQuantityGrid, adultKey, kidsKey } from "./SizeQuantityGrid";
import { LogoCustomization } from "./LogoCustomization";
import { TeamCustomization, type TeamRoster } from "./TeamCustomization";
import { TrustBadges } from "./TrustBadges";
import { WhatsAppButton } from "./WhatsAppButton";

type Props = {
  product: Product;
  quantities: Record<string, number>;
  onQuantityChange: (key: string, qty: number) => void;
  showKids: boolean;
  onShowKidsChange: (v: boolean) => void;
};

const breakdownLabel = (key: string) => {
  if (key.startsWith("adult-")) return key.slice("adult-".length);
  if (key.startsWith("kids-")) return `Inf. ${key.slice("kids-".length)}a`;
  return key;
};

export const BuyBox = forwardRef<HTMLDivElement, Props>(function BuyBox(
  { product, quantities, onQuantityChange, showKids, onShowKidsChange },
  ref,
) {
  const [pulsing, setPulsing] = useState(false);
  // logo customization (Agro)
  const [customizeLogo, setCustomizeLogo] = useState(false);
  const [logoPositions, setLogoPositions] = useState<string[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoNotes, setLogoNotes] = useState("");
  const logoCardRef = useRef<HTMLDivElement>(null);
  // team customization (Sports)
  const isSport = !!product.sport;
  const [customizeTeam, setCustomizeTeam] = useState(false);
  const [teamSelectedColor, setTeamSelectedColor] = useState<string | null>(null);
  const [teamCustomColor, setTeamCustomColor] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamRoster, setTeamRoster] = useState<TeamRoster[]>([
    { number: "", name: "" },
    { number: "", name: "" },
  ]);
  const [teamCrest, setTeamCrest] = useState<File | null>(null);
  const [teamNotes, setTeamNotes] = useState("");
  const teamCardRef = useRef<HTMLDivElement>(null);

  const { addItems } = useCart();
  const navigate = useNavigate();

  const totalQty = useMemo(
    () => Object.values(quantities).reduce((sum, n) => sum + (n || 0), 0),
    [quantities],
  );

  const tier = useMemo(() => getTierForQty(product.tiers, totalQty), [product.tiers, totalQty]);
  const orderTotal = totalQty * tier.price;

  const breakdown = useMemo(
    () =>
      Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(([key, qty]) => `${qty}× ${breakdownLabel(key)}`),
    [quantities],
  );

  const teamColorLabel =
    teamCustomColor.trim() ||
    (teamSelectedColor ? product.sport?.defaultColors.find((c) => c.hex === teamSelectedColor)?.name : "");

  const filledRoster = teamRoster.filter((r) => r.number.trim() || r.name.trim());

  const handleAddToCart = () => {
    if (totalQty === 0) {
      toast.error("Escolha pelo menos um tamanho", {
        description: "Use os botões + para adicionar unidades.",
      });
      return;
    }
    if (!isSport && customizeLogo && logoPositions.length === 0) {
      toast.error("Selecione ao menos uma posição da logo");
      logoCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!isSport && customizeLogo && !logoFile) {
      toast.error("Envie sua logo para continuar", {
        description: "Arraste ou clique no campo de upload.",
      });
      logoCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (isSport && customizeTeam && !teamColorLabel) {
      toast.error("Escolha a cor principal do uniforme");
      teamCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setPulsing(true);
    setTimeout(() => setPulsing(false), 600);

    let customization: Parameters<typeof addItems>[0][number]["customization"];
    if (isSport && customizeTeam) {
      customization = {
        team: {
          color: teamColorLabel || undefined,
          teamName: teamName.trim() || undefined,
          crestFileName: teamCrest?.name,
          roster: filledRoster.length ? filledRoster : undefined,
        },
        notes: teamNotes.trim() || undefined,
      };
    } else if (!isSport && customizeLogo && logoFile) {
      customization = {
        positions: logoPositions,
        fileName: logoFile.name,
        notes: logoNotes.trim() || undefined,
      };
    }

    const newLines = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([sizeKey, qty]) => ({
        productSlug: product.slug,
        productName: product.name,
        productImage: product.images[0]?.src ?? "",
        sizeKey,
        sizeLabel: breakdownLabel(sizeKey),
        qty,
        customization,
      }));

    addItems(newLines);

    toast.success("Adicionado ao carrinho", {
      description: `${totalQty} un · indo para o carrinho…`,
    });

    setTimeout(() => navigate("/carrinho"), 350);
  };

  const whatsappLines = [
    `Olá! Tenho interesse no produto:`,
    ``,
    `*${product.name}*`,
    breakdown.length > 0 ? `Itens:\n${breakdown.map((b) => `• ${b}`).join("\n")}` : `Itens: a definir`,
    `Total de unidades: ${totalQty}`,
    `Faixa: ${tier.label} (${tier.range})`,
    `Valor por unidade: ${formatBRL(tier.price)}`,
    `Total estimado: ${formatBRL(orderTotal)}`,
  ];

  if (!isSport && customizeLogo) {
    whatsappLines.push(``, `*Personalização:*`);
    if (logoPositions.length > 0)
      whatsappLines.push(`Posições: ${logoPositions.join(", ")}`);
    if (logoFile) whatsappLines.push(`Logo: ${logoFile.name} (${(logoFile.size / 1024).toFixed(0)} KB)`);
    if (logoNotes.trim()) whatsappLines.push(`Obs: ${logoNotes.trim()}`);
    whatsappLines.push(`(vou anexar a arte nesta conversa)`);
  }

  if (isSport && customizeTeam) {
    whatsappLines.push(``, `*Personalização do time:*`);
    if (teamColorLabel) whatsappLines.push(`Cor principal: ${teamColorLabel}`);
    if (teamName.trim()) whatsappLines.push(`Nome do time: ${teamName.trim()}`);
    if (teamCrest) whatsappLines.push(`Escudo: ${teamCrest.name}`);
    if (filledRoster.length) {
      whatsappLines.push(`Atletas (${filledRoster.length}):`);
      filledRoster.forEach((r) =>
        whatsappLines.push(`  ${r.number || "-"} · ${r.name || "(sem nome)"}`),
      );
    }
    if (teamNotes.trim()) whatsappLines.push(`Obs: ${teamNotes.trim()}`);
    whatsappLines.push(`(vou anexar a arte e a lista completa nesta conversa)`);
  }

  whatsappLines.push(``, `Poderia me ajudar?`);
  const whatsappMessage = whatsappLines.join("\n");

  return (
    <section className="px-4 lg:px-0 lg:pl-2 pt-8 pb-2 bg-background lg:max-w-[560px]">
      {/* Title + rating */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground leading-[1.1]">
          {product.name}
        </h1>
        <p className="text-sm lg:text-base text-muted-foreground">{product.tagline}</p>

        <div className="flex items-center gap-2 pt-1">
          <div className="flex" aria-label={`${product.rating} de 5 estrelas`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-star text-star" />
            ))}
          </div>
          <span className="text-xs font-medium text-foreground">{product.rating}/5</span>
          <span className="text-xs text-muted-foreground">
            ({product.reviewCount} Avaliações de Produtores)
          </span>
        </div>
      </div>

      {/* Price summary */}
      <div className="flex items-baseline gap-3 mt-5">
        <span className="text-3xl font-extrabold text-foreground tabular-nums">
          {formatBRL(tier.price)}
        </span>
        {tier.discountPct > 0 && (
          <span className="text-sm text-muted-foreground line-through tabular-nums">
            {formatBRL(product.basePrice)}
          </span>
        )}
        {tier.discountPct > 0 && (
          <span className="text-xs font-bold text-scarcity uppercase tracking-wide">
            {tier.discountPct}% OFF
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        ou em até 6x sem juros no cartão
      </p>

      {/* Order total summary moved next to CTA below */}

      {/* Scarcity */}
      <div className="mt-5 flex items-center gap-2 bg-scarcity-bg border border-scarcity-border rounded-lg px-3 py-2.5">
        <Flame className="h-4 w-4 text-scarcity shrink-0" fill="currentColor" />
        <span className="text-xs font-medium text-foreground">{product.scarcityMessage}</span>
      </div>

      {/* Volume pricing (display-only) */}
      <div className="mt-7">
        <VolumePricing tiers={product.tiers} totalQty={totalQty} activeTierId={tier.id} />
      </div>

      {/* Sizes */}
      <div className="mt-7">
        <SizeQuantityGrid
          adultSizes={product.sizes.adult}
          kidsSizes={product.sizes.kids}
          quantities={quantities}
          onChange={onQuantityChange}
          showKids={showKids}
          onToggleKids={onShowKidsChange}
        />
      </div>

      {/* Customization (logo for Agro · team for Sports) */}
      <div className="mt-7">
        {isSport && product.sport ? (
          <TeamCustomization
            ref={teamCardRef}
            enabled={customizeTeam}
            onEnabledChange={setCustomizeTeam}
            colors={product.sport.defaultColors}
            selectedColor={teamSelectedColor}
            onSelectedColorChange={setTeamSelectedColor}
            customColor={teamCustomColor}
            onCustomColorChange={setTeamCustomColor}
            teamName={teamName}
            onTeamNameChange={setTeamName}
            roster={teamRoster}
            onRosterChange={setTeamRoster}
            crestFile={teamCrest}
            onCrestFileChange={setTeamCrest}
            notes={teamNotes}
            onNotesChange={setTeamNotes}
          />
        ) : (
          <LogoCustomization
            ref={logoCardRef}
            enabled={customizeLogo}
            onEnabledChange={setCustomizeLogo}
            positions={logoPositions}
            onPositionsChange={setLogoPositions}
            file={logoFile}
            onFileChange={setLogoFile}
            notes={logoNotes}
            onNotesChange={setLogoNotes}
          />
        )}
      </div>

      {/* CTAs */}
      <div ref={ref} className="mt-7 space-y-3">
        <motion.button
          type="button"
          onClick={handleAddToCart}
          whileTap={{ scale: 0.98 }}
          animate={pulsing ? { scale: [1, 1.03, 1] } : {}}
          transition={{ duration: 0.4 }}
          className="flex items-center w-full min-h-14 rounded-xl bg-foreground text-primary-foreground font-semibold hover:bg-brand-soft transition-colors px-4 py-2.5"
        >
          <ShoppingBag className="h-5 w-5 shrink-0" strokeWidth={2} />
          {totalQty > 0 ? (
            <div className="flex items-center justify-between flex-1 ml-3 gap-3">
              <div className="flex flex-col items-start leading-tight text-left">
                <span className="text-base font-semibold">
                  Adicionar · {totalQty} {totalQty === 1 ? "un" : "un"}
                </span>
                <span className="text-[11px] font-normal opacity-70 tabular-nums">
                  {formatBRL(tier.price)} / un · Total {formatBRL(orderTotal)}
                </span>
              </div>
            </div>
          ) : (
            <span className="ml-3 text-base">Adicionar ao Carrinho</span>
          )}
        </motion.button>

        <WhatsAppButton phone={product.whatsappNumber} message={whatsappMessage} />
      </div>

      {/* Trust */}
      <div className="mt-7">
        <TrustBadges badges={product.trustBadges} />
      </div>
    </section>
  );
});
