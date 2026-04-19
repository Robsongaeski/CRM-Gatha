import productFront from "@/assets/site/product-front.jpg";
import productBack from "@/assets/site/product-back.jpg";
import productDetail from "@/assets/site/product-detail.jpg";
import productLifestyle from "@/assets/site/product-lifestyle.jpg";
import avatar1 from "@/assets/site/avatar-1.jpg";
import avatar2 from "@/assets/site/avatar-2.jpg";
import avatar3 from "@/assets/site/avatar-3.jpg";
import avatar4 from "@/assets/site/avatar-4.jpg";
import sportSoccer from "@/assets/site/sport-soccer.jpg";
import sportSoccerCustom from "@/assets/site/sport-soccer-custom.jpg";
import sportVolleyball from "@/assets/site/sport-volleyball.jpg";
import sportVolleyballCustom from "@/assets/site/sport-volleyball-custom.jpg";
import sportBasketball from "@/assets/site/sport-basketball.jpg";
import sportBasketballCustom from "@/assets/site/sport-basketball-custom.jpg";
// Terceirão
import terceiraoMoletom from "@/assets/site/product-terceirao-moletom.jpg";
import terceiraoJaqueta from "@/assets/site/product-terceirao-jaqueta.jpg";
import terceiraoCamiseta from "@/assets/site/product-terceirao-camiseta.jpg";
// Empresarial
import empresarialPolo from "@/assets/site/product-empresarial-polo.jpg";
import empresarialCamisa from "@/assets/site/product-empresarial-camisa.jpg";
import empresarialJaqueta from "@/assets/site/product-empresarial-jaqueta.jpg";
// Indústria
import industriaCamisa from "@/assets/site/product-industria-camisa.jpg";
import industriaColete from "@/assets/site/product-industria-colete.jpg";
import industriaMacacao from "@/assets/site/product-industria-macacao.jpg";
// Corridas
import corridasCamiseta from "@/assets/site/product-corridas-camiseta.jpg";
import corridasRegata from "@/assets/site/product-corridas-regata.jpg";
import corridasCortaVento from "@/assets/site/product-corridas-corta-vento.jpg";

export type VolumeTier = {
  id: string;
  label: string;
  range: string;
  minQty: number;
  maxQty: number | null;
  price: number;
  discountPct: number;
  recommended?: boolean;
};

export type Review = {
  id: string;
  name: string;
  location: string;
  date: string;
  rating: number;
  text: string;
  avatar: string;
};

export type Product = {
  slug: string;
  /** Category slug (matches data/categories.ts). Optional for legacy. */
  category?: string;
  name: string;
  shortName: string;
  tagline: string;
  basePrice: number;
  rating: number;
  reviewCount: number;
  scarcityMessage: string;
  images: { src: string; alt: string }[];
  sizes: { adult: string[]; kids: string[] };
  tiers: VolumeTier[];
  trustBadges: { icon: "uv" | "dryfit" | "antiodor" | "print"; label: string }[];
  details: {
    material: string;
    fit: string;
    collar: string;
    care: string;
  };
  customization: string;
  shipping: string;
  reviews: Review[];
  whatsappNumber: string;
  /** When set, enables team-customization fields (number, player name, color) instead of a generic logo. */
  sport?: {
    category: "futebol" | "volei" | "basquete";
    defaultColors: { name: string; hex: string }[];
  };
};

export const products: Product[] = [
  {
    slug: "agrotech-performance-manga-longa",
    category: "agro",
    name: "AgroTech Performance — Manga Longa UV50+",
    shortName: "AgroTech Performance ML",
    tagline: "Tecnologia que aguenta o dia inteiro no campo.",
    basePrice: 119.9,
    rating: 4.9,
    reviewCount: 128,
    scarcityMessage: "Apenas 4 lotes disponíveis para produção essa semana.",
    images: [
      { src: productFront, alt: "Camiseta AgroTech manga longa cinza — vista frontal" },
      { src: productBack, alt: "Camiseta AgroTech manga longa cinza — vista traseira" },
      { src: productDetail, alt: "Detalhe da gola ribana 2x1 e tecido dry-fit" },
      { src: productLifestyle, alt: "Produtor rural usando a camiseta AgroTech ao amanhecer" },
    ],
    sizes: {
      adult: ["PP", "P", "M", "G", "GG", "G1", "G2", "G3", "G4"],
      kids: ["2", "4", "6", "8", "10", "12", "14"],
    },
    tiers: [
      { id: "retail", label: "Varejo", range: "1 a 9 unidades", minQty: 1, maxQty: 9, price: 119.9, discountPct: 0 },
      { id: "team", label: "Equipe", range: "10 a 49 unidades", minQty: 10, maxQty: 49, price: 101.9, discountPct: 15, recommended: true },
      { id: "farm", label: "Fazenda", range: "50 unidades ou mais", minQty: 50, maxQty: null, price: 83.93, discountPct: 30 },
    ],
    trustBadges: [
      { icon: "uv", label: "UV50+" },
      { icon: "dryfit", label: "Dry-Fit Alta Performance" },
      { icon: "antiodor", label: "Antiodor" },
      { icon: "print", label: "Estampa Toque Zero" },
    ],
    details: {
      material: "92% poliamida + 8% elastano. Tecido dry-fit de alta gramatura (165g/m²) com proteção UV50+ certificada.",
      fit: "Modelagem regular fit, com costura raglan e laterais sem emenda para máxima mobilidade.",
      collar: "Gola ribana 2x1 com elastano — não deforma, não enrola e mantém o caimento depois de muitas lavagens.",
      care: "Lavar à máquina até 30°C. Não usar alvejante. Secar à sombra.",
    },
    customization:
      "Aplicação de logos por sublimação direta no tecido — toque zero, sem relevo e sem rachar. Áreas disponíveis: peito, costas, mangas e gola. Envie sua arte em PDF ou vetor após o pedido.",
    shipping:
      "Produção sob demanda em 10 a 15 dias úteis após aprovação da arte. Frete enviado por transportadora rastreada para todo o Brasil. Frete grátis em pedidos acima de R$ 499.",
    reviews: [
      {
        id: "r1",
        name: "Carlos M.",
        location: "Sorriso/MT",
        date: "março de 2025",
        rating: 5,
        text: "As camisas aguentaram o trabalho no sol o dia todo. O tecido dry-fit é excelente, não esquenta e seca rápido. Equipe inteira aprovou.",
        avatar: avatar1,
      },
      {
        id: "r2",
        name: "Rafael S.",
        location: "Rio Verde/GO",
        date: "fevereiro de 2025",
        rating: 5,
        text: "Comprei 30 unidades para a equipe da fazenda. Caimento ótimo, costura impecável e a estampa do logo ficou perfeita. Já vou repetir.",
        avatar: avatar2,
      },
      {
        id: "r3",
        name: "Juliana A.",
        location: "Lucas do Rio Verde/MT",
        date: "fevereiro de 2025",
        rating: 5,
        text: "Recebi antes do prazo e a qualidade superou. Tecido leve, proteção UV de verdade e o atendimento pelo WhatsApp foi rápido e atencioso.",
        avatar: avatar3,
      },
      {
        id: "r4",
        name: "Seu Antônio",
        location: "Barreiras/BA",
        date: "janeiro de 2025",
        rating: 5,
        text: "Trabalho com gado o dia inteiro e essa camisa é a melhor que já usei. Não fica fedendo no fim do dia e o tecido respira de verdade.",
        avatar: avatar4,
      },
    ],
    whatsappNumber: "5511999999999",
  },
  // ===== Esportivos =====
  {
    slug: "uniforme-futebol-pro",
    category: "esportivos",
    name: "Camisa Futebol Pro — Sublimada",
    shortName: "Camisa Futebol Pro",
    tagline: "Modelagem oficial, leve e respirável. Personalização total do seu time.",
    basePrice: 129.9,
    rating: 4.9,
    reviewCount: 86,
    scarcityMessage: "Última semana com layout grátis para times completos.",
    images: [
      { src: sportSoccer, alt: "Camisa de futebol — vista frontal ghost mannequin" },
      { src: sportSoccerCustom, alt: "Camisa de futebol personalizada com nome e número" },
    ],
    sizes: {
      adult: ["PP", "P", "M", "G", "GG", "G1", "G2"],
      kids: ["4", "6", "8", "10", "12", "14"],
    },
    tiers: [
      { id: "retail", label: "Avulso", range: "1 a 9 unidades", minQty: 1, maxQty: 9, price: 129.9, discountPct: 0 },
      { id: "kit10", label: "Kit Time", range: "10 a 19 unidades", minQty: 10, maxQty: 19, price: 99.9, discountPct: 23, recommended: true },
      { id: "kit20", label: "Kit Equipe", range: "20 unidades ou mais", minQty: 20, maxQty: null, price: 84.9, discountPct: 35 },
    ],
    trustBadges: [
      { icon: "uv", label: "UV50+" },
      { icon: "dryfit", label: "Dry-Fit Pro" },
      { icon: "antiodor", label: "Antiodor" },
      { icon: "print", label: "Sublimação HD" },
    ],
    details: {
      material: "100% poliéster esportivo (150g/m²) com tratamento dry-fit. Tecido respirável com micro-furos para ventilação ativa.",
      fit: "Modelagem athletic fit, corte raglan e laterais ergonômicas para liberdade total de movimento.",
      collar: "Gola V em ribana com elastano — não deforma e mantém o caimento profissional.",
      care: "Lavar à máquina até 30°C. Não passar sobre a estampa. Secar à sombra.",
    },
    customization:
      "Sublimação digital de alta definição: cores, número, nome do jogador, escudo do time e patrocinadores. Layout gratuito para pedidos a partir de 10 peças.",
    shipping:
      "Produção em 12 a 18 dias úteis após aprovação do layout. Frete por transportadora rastreada para todo o Brasil. Frete grátis em pedidos acima de R$ 1.499.",
    reviews: [
      {
        id: "sf1",
        name: "Rafael Souza",
        location: "Pato Branco/PR",
        date: "março de 2025",
        rating: 5,
        text: "Recebemos antes do prazo, estampa impecável e tecido muito leve. Time todo aprovou.",
        avatar: avatar1,
      },
      {
        id: "sf2",
        name: "Lucas P.",
        location: "Cascavel/PR",
        date: "fevereiro de 2025",
        rating: 5,
        text: "Pedi 22 camisas com nome e número. Ficou nível profissional, atendimento direto no zap.",
        avatar: avatar2,
      },
    ],
    whatsappNumber: "5511999999999",
    sport: {
      category: "futebol",
      defaultColors: [
        { name: "Vermelho/Preto", hex: "#C8102E" },
        { name: "Azul Royal", hex: "#1E40AF" },
        { name: "Verde", hex: "#15803D" },
        { name: "Amarelo", hex: "#FACC15" },
        { name: "Preto", hex: "#0F172A" },
        { name: "Branco", hex: "#F8FAFC" },
      ],
    },
  },
  {
    slug: "uniforme-volei-elite",
    category: "esportivos",
    name: "Camisa Vôlei Elite — Raglan",
    shortName: "Camisa Vôlei Elite",
    tagline: "Corte raglan com painéis laterais para máxima mobilidade no jogo.",
    basePrice: 119.9,
    rating: 4.8,
    reviewCount: 64,
    scarcityMessage: "Pacote Interclasses encerra inscrições nesta sexta.",
    images: [
      { src: sportVolleyball, alt: "Camisa de vôlei — vista frontal ghost mannequin" },
      { src: sportVolleyballCustom, alt: "Camisa de vôlei personalizada com nome e número" },
    ],
    sizes: {
      adult: ["PP", "P", "M", "G", "GG", "G1"],
      kids: ["10", "12", "14"],
    },
    tiers: [
      { id: "retail", label: "Avulso", range: "1 a 9 unidades", minQty: 1, maxQty: 9, price: 119.9, discountPct: 0 },
      { id: "kit10", label: "Kit Time", range: "10 a 19 unidades", minQty: 10, maxQty: 19, price: 92.9, discountPct: 23, recommended: true },
      { id: "kit20", label: "Kit Equipe", range: "20 unidades ou mais", minQty: 20, maxQty: null, price: 79.9, discountPct: 33 },
    ],
    trustBadges: [
      { icon: "uv", label: "UV50+" },
      { icon: "dryfit", label: "Dry-Fit Pro" },
      { icon: "antiodor", label: "Antiodor" },
      { icon: "print", label: "Sublimação HD" },
    ],
    details: {
      material: "Poliamida com elastano. Painéis laterais em mesh para ventilação extra durante saltos e ataques.",
      fit: "Corte raglan, modelagem slim com costuras flatlock que não machucam a pele.",
      collar: "Gola V baixa, sem peso e sem desconforto.",
      care: "Lavar à máquina até 30°C. Não usar amaciante na estampa. Secar à sombra.",
    },
    customization:
      "Sublimação total: nome, número, símbolo da turma e patrocinadores. Layout exclusivo gratuito para Interclasses e times federados.",
    shipping:
      "Produção em 10 a 15 dias úteis após aprovação. Envio rastreado para todo o Brasil.",
    reviews: [
      {
        id: "sv1",
        name: "Camila Fernandes",
        location: "Pato Branco/PR",
        date: "março de 2025",
        rating: 5,
        text: "Tecido respira de verdade. Joguei dois sets sem peso molhado. Recomendo demais.",
        avatar: avatar3,
      },
      {
        id: "sv2",
        name: "Profa. Marina Lopes",
        location: "Francisco Beltrão/PR",
        date: "fevereiro de 2025",
        rating: 5,
        text: "Pedi 8 turmas para o interclasses. Layout gratuito e desconto pra quantidade. Salvou.",
        avatar: avatar4,
      },
    ],
    whatsappNumber: "5511999999999",
    sport: {
      category: "volei",
      defaultColors: [
        { name: "Azul/Branco", hex: "#1E40AF" },
        { name: "Vermelho", hex: "#DC2626" },
        { name: "Preto", hex: "#0F172A" },
        { name: "Roxo", hex: "#7C3AED" },
        { name: "Laranja", hex: "#EA580C" },
      ],
    },
  },
  {
    slug: "regata-basquete-court",
    category: "esportivos",
    name: "Regata Basquete Court — Mesh",
    shortName: "Regata Basquete Court",
    tagline: "Tecido mesh ultraleve com acabamento profissional de quadra.",
    basePrice: 109.9,
    rating: 4.9,
    reviewCount: 42,
    scarcityMessage: "Apenas 6 vagas de produção este mês para regatas.",
    images: [
      { src: sportBasketball, alt: "Regata de basquete — vista frontal ghost mannequin" },
      { src: sportBasketballCustom, alt: "Regata de basquete personalizada com nome de equipe e número" },
    ],
    sizes: {
      adult: ["P", "M", "G", "GG", "G1", "G2"],
      kids: ["10", "12", "14"],
    },
    tiers: [
      { id: "retail", label: "Avulso", range: "1 a 9 unidades", minQty: 1, maxQty: 9, price: 109.9, discountPct: 0 },
      { id: "kit10", label: "Kit Time", range: "10 a 19 unidades", minQty: 10, maxQty: 19, price: 84.9, discountPct: 23, recommended: true },
      { id: "kit20", label: "Kit Equipe", range: "20 unidades ou mais", minQty: 20, maxQty: null, price: 72.9, discountPct: 34 },
    ],
    trustBadges: [
      { icon: "uv", label: "UV50+" },
      { icon: "dryfit", label: "Dry-Fit Pro" },
      { icon: "antiodor", label: "Antiodor" },
      { icon: "print", label: "Sublimação HD" },
    ],
    details: {
      material: "Tecido mesh esportivo ultraleve (130g/m²) com excelente caimento e ventilação total.",
      fit: "Modelagem clássica de quadra, cavas amplas e barra reta.",
      collar: "Decote redondo com vivo contrastante.",
      care: "Lavar à máquina até 30°C. Não passar sobre estampa. Secar à sombra.",
    },
    customization:
      "Nome da equipe, número grande nas costas e na frente, escudo e patrocinadores. Combinações de cores ilimitadas via sublimação.",
    shipping:
      "Produção em 10 a 15 dias úteis após aprovação do layout. Frete rastreado nacional.",
    reviews: [
      {
        id: "sb1",
        name: "Diego Almeida",
        location: "Curitiba/PR",
        date: "março de 2025",
        rating: 5,
        text: "Regatas leves e com acabamento topíssimo. Time gostou tanto que já pedimos a segunda leva.",
        avatar: avatar2,
      },
    ],
    whatsappNumber: "5511999999999",
    sport: {
      category: "basquete",
      defaultColors: [
        { name: "Preto/Amarelo", hex: "#0F172A" },
        { name: "Azul Marinho", hex: "#1E3A8A" },
        { name: "Vermelho", hex: "#B91C1C" },
        { name: "Verde", hex: "#15803D" },
        { name: "Branco", hex: "#F8FAFC" },
      ],
    },
  },
  // ===== Terceirão / Formandos =====
  {
    slug: "terceirao-moletom-classico",
    category: "terceirao",
    name: "Moletom Terceirão Clássico — Class of 2025",
    shortName: "Moletom Terceirão",
    tagline: "O moletom que sua turma vai usar pelo resto da vida.",
    basePrice: 219.9,
    rating: 5.0,
    reviewCount: 47,
    scarcityMessage: "Agenda de produção fecha em 3 semanas para entrega na formatura.",
    images: [
      { src: terceiraoMoletom, alt: "Moletom Terceirão preto com estampa Class of 2025 dourada — vista traseira" },
    ],
    sizes: { adult: ["PP", "P", "M", "G", "GG", "G1", "G2"], kids: [] },
    tiers: [
      { id: "retail", label: "Avulso", range: "1 a 9 unidades", minQty: 1, maxQty: 9, price: 219.9, discountPct: 0 },
      { id: "kit25", label: "Kit Turma 25+", range: "25 a 49 unidades", minQty: 25, maxQty: 49, price: 179.9, discountPct: 18, recommended: true },
      { id: "kit50", label: "Kit Turma 50+", range: "50 unidades ou mais", minQty: 50, maxQty: null, price: 159.9, discountPct: 27 },
    ],
    trustBadges: [
      { icon: "print", label: "Bordado Premium" },
      { icon: "dryfit", label: "Moletom Flanelado" },
      { icon: "antiodor", label: "Acabamento Refinado" },
      { icon: "uv", label: "Tecido Premium 320g" },
    ],
    details: {
      material: "Moletom flanelado 320g/m² (80% algodão / 20% poliéster). Toque macio e felpado por dentro.",
      fit: "Modelagem oversized clássica universitária com bolso canguru frontal.",
      collar: "Capuz duplo com cordão chato e ribana 2x1 nos punhos.",
      care: "Lavar do avesso até 30°C. Não usar alvejante. Secar à sombra.",
    },
    customization: "Bordado ou estampa em alta definição. Nome da turma, ano de formatura, apelido nas costas e logo do colégio. Layout exclusivo desenvolvido pelo nosso designer.",
    shipping: "Produção em 18 a 25 dias úteis após aprovação. Cronograma planejado para entregar antes da formatura.",
    reviews: [
      { id: "tm1", name: "Beatriz L.", location: "Pato Branco/PR", date: "novembro de 2024", rating: 5, text: "A turma toda chorou quando viu. Ficou nível profissional, o tecido é grosso e gostoso.", avatar: avatar3 },
      { id: "tm2", name: "Pedro A.", location: "Curitiba/PR", date: "outubro de 2024", rating: 5, text: "Comissão de formatura aqui. O layout que fizeram virou referência no Insta.", avatar: avatar1 },
    ],
    whatsappNumber: "5511999999999",
  },
  {
    slug: "terceirao-jaqueta-college",
    category: "terceirao",
    name: "Jaqueta College Terceirão — Brasão da Turma",
    shortName: "Jaqueta College",
    tagline: "Estilo varsity americano com o brasão da sua turma.",
    basePrice: 359.9,
    rating: 5.0,
    reviewCount: 31,
    scarcityMessage: "Pedidos para formatura: agenda fecha em 4 semanas.",
    images: [
      { src: terceiraoJaqueta, alt: "Jaqueta college azul marinho com mangas em couro e brasão da turma bordado" },
    ],
    sizes: { adult: ["PP", "P", "M", "G", "GG", "G1", "G2"], kids: [] },
    tiers: [
      { id: "retail", label: "Avulso", range: "1 a 9 unidades", minQty: 1, maxQty: 9, price: 359.9, discountPct: 0 },
      { id: "kit25", label: "Kit Turma 25+", range: "25 a 49 unidades", minQty: 25, maxQty: 49, price: 299.9, discountPct: 17, recommended: true },
      { id: "kit50", label: "Kit Turma 50+", range: "50 unidades ou mais", minQty: 50, maxQty: null, price: 269.9, discountPct: 25 },
    ],
    trustBadges: [
      { icon: "print", label: "Bordado de Brasão" },
      { icon: "dryfit", label: "Forro Acetinado" },
      { icon: "antiodor", label: "Mangas em Couro Eco" },
      { icon: "uv", label: "Lã Encorpada" },
    ],
    details: {
      material: "Corpo em mescla lã/poliéster com mangas em couro ecológico. Forro interno acetinado.",
      fit: "Modelagem clássica varsity, gola ribana com listras contrastantes nos punhos e barra.",
      collar: "Gola ribana baixa em algodão com listras tradicionais college.",
      care: "Lavagem a seco recomendada. Não passar diretamente sobre o brasão bordado.",
    },
    customization: "Brasão bordado no peito + nome da turma e apelido nas costas. Cores da jaqueta personalizáveis (corpo, mangas, listras).",
    shipping: "Produção em 25 a 35 dias úteis após aprovação do brasão.",
    reviews: [
      { id: "tj1", name: "Larissa M.", location: "Cascavel/PR", date: "dezembro de 2024", rating: 5, text: "Jaqueta de cinema. Forro acetinado e bordado impecável. Vou guardar pra sempre.", avatar: avatar4 },
    ],
    whatsappNumber: "5511999999999",
  },
  {
    slug: "terceirao-camiseta-comemorativa",
    category: "terceirao",
    name: "Camiseta Comemorativa Terceirão",
    shortName: "Camiseta Terceirão",
    tagline: "A primeira peça do kit, com o emblema oficial da turma.",
    basePrice: 89.9,
    rating: 4.9,
    reviewCount: 62,
    scarcityMessage: "Combo com moletom: -20% no kit completo.",
    images: [
      { src: terceiraoCamiseta, alt: "Camiseta cinza escuro com emblema bordado discreto da turma 2025 no peito" },
    ],
    sizes: { adult: ["PP", "P", "M", "G", "GG", "G1", "G2"], kids: [] },
    tiers: [
      { id: "retail", label: "Avulso", range: "1 a 9 unidades", minQty: 1, maxQty: 9, price: 89.9, discountPct: 0 },
      { id: "kit25", label: "Kit Turma 25+", range: "25 a 49 unidades", minQty: 25, maxQty: 49, price: 69.9, discountPct: 22, recommended: true },
      { id: "kit50", label: "Kit Turma 50+", range: "50 unidades ou mais", minQty: 50, maxQty: null, price: 59.9, discountPct: 33 },
    ],
    trustBadges: [
      { icon: "print", label: "Bordado Discreto" },
      { icon: "dryfit", label: "Algodão Pima" },
      { icon: "antiodor", label: "Caimento Premium" },
      { icon: "uv", label: "Pré-lavada" },
    ],
    details: {
      material: "Algodão pima penteado 180g/m². Pré-lavado, não encolhe.",
      fit: "Modelagem regular com gola careca reforçada e barra reta.",
      collar: "Gola careca em ribana com elastano que mantém a forma.",
      care: "Lavar à máquina até 30°C. Não usar alvejante. Secar à sombra.",
    },
    customization: "Emblema bordado no peito + nome no manga ou costas. Discreto e elegante.",
    shipping: "Produção em 12 a 18 dias úteis após aprovação.",
    reviews: [
      { id: "tc1", name: "Gustavo R.", location: "Pato Branco/PR", date: "novembro de 2024", rating: 5, text: "Camiseta de qualidade premium. Uso até pra sair, não só pro colégio.", avatar: avatar2 },
    ],
    whatsappNumber: "5511999999999",
  },
  // ===== Empresarial / Corporativo =====
  {
    slug: "empresarial-polo-premium",
    category: "empresarial",
    name: "Polo Corporativa Premium — Bordado",
    shortName: "Polo Corporativa",
    tagline: "O polo que veste a sua marca com sofisticação.",
    basePrice: 139.9,
    rating: 4.9,
    reviewCount: 89,
    scarcityMessage: "Atendemos pedidos a partir de 25 peças com bordado grátis.",
    images: [
      { src: empresarialPolo, alt: "Polo corporativa em piquet cinza grafite com logo bordado discreto no peito" },
    ],
    sizes: { adult: ["PP", "P", "M", "G", "GG", "G1", "G2", "G3"], kids: [] },
    tiers: [
      { id: "retail", label: "Avulso", range: "1 a 9 unidades", minQty: 1, maxQty: 9, price: 139.9, discountPct: 0 },
      { id: "kit25", label: "Kit Equipe 25+", range: "25 a 99 unidades", minQty: 25, maxQty: 99, price: 109.9, discountPct: 21, recommended: true },
      { id: "kit100", label: "Kit Corporativo 100+", range: "100 unidades ou mais", minQty: 100, maxQty: null, price: 89.9, discountPct: 36 },
    ],
    trustBadges: [
      { icon: "print", label: "Bordado Premium" },
      { icon: "dryfit", label: "Piquet Premium" },
      { icon: "antiodor", label: "Pantone Exato" },
      { icon: "uv", label: "Lavável Industrial" },
    ],
    details: {
      material: "Malha piquet premium (50% algodão / 50% poliéster) — 200g/m². Resistente a lavagens frequentes.",
      fit: "Modelagem moderna slim, modelagem masculina e feminina disponíveis.",
      collar: "Gola e punhos em ribana com costura embutida e abertura com 3 botões em tom sobre tom.",
      care: "Lavagem doméstica ou industrial até 60°C. Não usar alvejante.",
    },
    customization: "Bordado de logo no peito esquerdo (até 8x8cm). Reproduzimos cor exata do manual de marca (Pantone). Nome do colaborador opcional.",
    shipping: "Produção em 15 a 22 dias úteis após aprovação. Nota fiscal e pedido formal.",
    reviews: [
      { id: "ep1", name: "Renata F.", location: "São Paulo/SP", date: "março de 2025", rating: 5, text: "Vestimos 120 colaboradores em 18 dias. Bordado nota 10.", avatar: avatar3 },
      { id: "ep2", name: "Marcos T.", location: "Curitiba/PR", date: "fevereiro de 2025", rating: 5, text: "Cor da marca reproduzida com fidelidade impressionante.", avatar: avatar1 },
    ],
    whatsappNumber: "5511999999999",
  },
  {
    slug: "empresarial-camisa-social",
    category: "empresarial",
    name: "Camisa Social Corporativa",
    shortName: "Camisa Social Corporativa",
    tagline: "Para quem leva a apresentação a sério.",
    basePrice: 189.9,
    rating: 4.9,
    reviewCount: 54,
    scarcityMessage: "Kits para eventos corporativos: agenda 60 dias.",
    images: [
      { src: empresarialCamisa, alt: "Camisa social corporativa branca com logo bordado discreto no peito" },
    ],
    sizes: { adult: ["P", "M", "G", "GG", "G1", "G2"], kids: [] },
    tiers: [
      { id: "retail", label: "Avulso", range: "1 a 9 unidades", minQty: 1, maxQty: 9, price: 189.9, discountPct: 0 },
      { id: "kit25", label: "Kit Equipe 25+", range: "25 a 99 unidades", minQty: 25, maxQty: 99, price: 149.9, discountPct: 21, recommended: true },
      { id: "kit100", label: "Kit Corporativo 100+", range: "100 unidades ou mais", minQty: 100, maxQty: null, price: 129.9, discountPct: 32 },
    ],
    trustBadges: [
      { icon: "print", label: "Bordado Discreto" },
      { icon: "dryfit", label: "Algodão Egípcio" },
      { icon: "antiodor", label: "Anti-vincos" },
      { icon: "uv", label: "Modelagem Slim" },
    ],
    details: {
      material: "Tricoline 100% algodão egípcio com tratamento anti-vincos. Toque acetinado.",
      fit: "Modelagem slim moderna com pences nas costas. Disponível em cortes masculino e feminino.",
      collar: "Colarinho italiano com entretela termocolante de alta qualidade.",
      care: "Lavar à máquina até 40°C. Passar a vapor com facilidade.",
    },
    customization: "Bordado de logo no peito ou punho. Cores do manual de marca reproduzidas em Pantone.",
    shipping: "Produção em 18 a 25 dias úteis após aprovação.",
    reviews: [
      { id: "ec1", name: "Aline R.", location: "Florianópolis/SC", date: "fevereiro de 2025", rating: 5, text: "Equipe diretiva ficou impecável no evento. Caimento perfeito.", avatar: avatar4 },
    ],
    whatsappNumber: "5511999999999",
  },
  {
    slug: "empresarial-jaqueta-softshell",
    category: "empresarial",
    name: "Jaqueta Softshell Corporativa",
    shortName: "Jaqueta Softshell",
    tagline: "Conforto técnico para sua equipe em qualquer estação.",
    basePrice: 289.9,
    rating: 5.0,
    reviewCount: 38,
    scarcityMessage: "Ideal para visitas externas e eventos outdoor da empresa.",
    images: [
      { src: empresarialJaqueta, alt: "Jaqueta softshell azul marinho com logo bordado e zíper YKK" },
    ],
    sizes: { adult: ["P", "M", "G", "GG", "G1", "G2"], kids: [] },
    tiers: [
      { id: "retail", label: "Avulso", range: "1 a 9 unidades", minQty: 1, maxQty: 9, price: 289.9, discountPct: 0 },
      { id: "kit25", label: "Kit Equipe 25+", range: "25 a 99 unidades", minQty: 25, maxQty: 99, price: 229.9, discountPct: 21, recommended: true },
      { id: "kit100", label: "Kit Corporativo 100+", range: "100 unidades ou mais", minQty: 100, maxQty: null, price: 199.9, discountPct: 31 },
    ],
    trustBadges: [
      { icon: "print", label: "Bordado Premium" },
      { icon: "dryfit", label: "Softshell 3 Camadas" },
      { icon: "antiodor", label: "Resistente à Água" },
      { icon: "uv", label: "Zíper YKK" },
    ],
    details: {
      material: "Softshell de 3 camadas com membrana impermeável e respirável. Forro fleece interno.",
      fit: "Modelagem athletic fit com costuras ergonômicas e bolsos com zíper.",
      collar: "Gola alta com proteção de queixo e capuz removível opcional.",
      care: "Lavar à máquina até 30°C. Não passar. Não usar amaciante.",
    },
    customization: "Bordado de logo no peito + opção de bordado ou bandeira nas mangas.",
    shipping: "Produção em 22 a 30 dias úteis após aprovação.",
    reviews: [
      { id: "ej1", name: "Cláudio M.", location: "Porto Alegre/RS", date: "janeiro de 2025", rating: 5, text: "Equipe de campo adora. Esquenta e não pesa nas visitas externas.", avatar: avatar2 },
    ],
    whatsappNumber: "5511999999999",
  },
  // ===== Indústria =====
  {
    slug: "industria-camisa-hi-vis",
    category: "industria",
    name: "Camisa Industrial Hi-Vis com Refletivo",
    shortName: "Camisa Hi-Vis",
    tagline: "Alta visibilidade, durabilidade industrial e refletivo certificado.",
    basePrice: 159.9,
    rating: 4.9,
    reviewCount: 76,
    scarcityMessage: "Lote especial para empresas de energia solar e elétrica.",
    images: [
      { src: industriaCamisa, alt: "Camisa industrial laranja fluorescente com faixas refletivas conforme NR" },
    ],
    sizes: { adult: ["P", "M", "G", "GG", "G1", "G2", "G3"], kids: [] },
    tiers: [
      { id: "retail", label: "Avulso", range: "1 a 9 unidades", minQty: 1, maxQty: 9, price: 159.9, discountPct: 0 },
      { id: "kit50", label: "Kit Operação 50+", range: "50 a 199 unidades", minQty: 50, maxQty: 199, price: 124.9, discountPct: 22, recommended: true },
      { id: "kit200", label: "Kit Indústria 200+", range: "200 unidades ou mais", minQty: 200, maxQty: null, price: 99.9, discountPct: 38 },
    ],
    trustBadges: [
      { icon: "print", label: "Refletivo Certificado" },
      { icon: "dryfit", label: "Sarja Reforçada" },
      { icon: "antiodor", label: "Alta Visibilidade" },
      { icon: "uv", label: "Lavagem Industrial" },
    ],
    details: {
      material: "Sarja 2/1 brim profissional 240g/m² (67% poliéster / 33% algodão) com tratamento ripstop.",
      fit: "Modelagem ampla profissional com bolsos frontais reforçados e costuras triplas.",
      collar: "Colarinho esporte com botão e pala dupla nas costas para ventilação.",
      care: "Aceita lavagem industrial até 60°C. Refletivo mantém eficácia por 50+ ciclos.",
    },
    customization: "Logo bordado ou silk industrial. Numeração e função do colaborador disponível.",
    shipping: "Produção em 18 a 28 dias úteis. Nota fiscal e ficha técnica de tecido inclusas.",
    reviews: [
      { id: "in1", name: "Eng. Ricardo P.", location: "Joinville/SC", date: "março de 2025", rating: 5, text: "Aguenta lavagem industrial pesada e mantém cor. Diferencial.", avatar: avatar1 },
      { id: "in2", name: "André S.", location: "Goiânia/GO", date: "fevereiro de 2025", rating: 5, text: "Equipe de instalação solar usa todo dia. Refletivo de qualidade real.", avatar: avatar2 },
    ],
    whatsappNumber: "5511999999999",
  },
  {
    slug: "industria-colete-refletivo",
    category: "industria",
    name: "Colete Refletivo Hi-Vis Multifuncional",
    shortName: "Colete Refletivo",
    tagline: "Visibilidade máxima em qualquer ambiente de risco.",
    basePrice: 79.9,
    rating: 4.8,
    reviewCount: 92,
    scarcityMessage: "Pedidos recorrentes: tabela negociada para contratos.",
    images: [
      { src: industriaColete, alt: "Colete amarelo fluorescente com faixas refletivas e bolsos frontais" },
    ],
    sizes: { adult: ["P/M", "G/GG", "G1/G2"], kids: [] },
    tiers: [
      { id: "retail", label: "Avulso", range: "1 a 9 unidades", minQty: 1, maxQty: 9, price: 79.9, discountPct: 0 },
      { id: "kit50", label: "Kit Operação 50+", range: "50 a 199 unidades", minQty: 50, maxQty: 199, price: 59.9, discountPct: 25, recommended: true },
      { id: "kit200", label: "Kit Indústria 200+", range: "200 unidades ou mais", minQty: 200, maxQty: null, price: 49.9, discountPct: 38 },
    ],
    trustBadges: [
      { icon: "print", label: "Norma NR Atendida" },
      { icon: "dryfit", label: "Tecido Tactel" },
      { icon: "antiodor", label: "Refletivo Premium" },
      { icon: "uv", label: "Bolsos Frontais" },
    ],
    details: {
      material: "Tactel 100% poliéster fluorescente. Faixas refletivas categoria 2 conforme NR.",
      fit: "Modelagem aberta com fechamento em velcro frontal e ajuste lateral.",
      collar: "Gola redonda baixa, sem incômodo.",
      care: "Lavagem até 40°C. Não passar sobre as faixas refletivas.",
    },
    customization: "Logo da empresa em silk ou bordado. Nome/função opcional nas costas.",
    shipping: "Produção em 12 a 18 dias úteis. Pronta entrega disponível para alguns lotes.",
    reviews: [
      { id: "ic1", name: "Karen M.", location: "Belo Horizonte/MG", date: "março de 2025", rating: 5, text: "Pedimos 200 coletes. Caimento padronizado e zero defeito.", avatar: avatar3 },
    ],
    whatsappNumber: "5511999999999",
  },
  {
    slug: "industria-macacao-trabalho",
    category: "industria",
    name: "Macacão Industrial com Refletivo",
    shortName: "Macacão Industrial",
    tagline: "Proteção integral com mobilidade e bolsos funcionais.",
    basePrice: 249.9,
    rating: 4.9,
    reviewCount: 58,
    scarcityMessage: "Lote para indústria pesada: agenda 30 dias.",
    images: [
      { src: industriaMacacao, alt: "Macacão industrial cinza grafite com faixas refletivas e múltiplos bolsos" },
    ],
    sizes: { adult: ["P", "M", "G", "GG", "G1", "G2", "G3"], kids: [] },
    tiers: [
      { id: "retail", label: "Avulso", range: "1 a 9 unidades", minQty: 1, maxQty: 9, price: 249.9, discountPct: 0 },
      { id: "kit50", label: "Kit Operação 50+", range: "50 a 199 unidades", minQty: 50, maxQty: 199, price: 199.9, discountPct: 20, recommended: true },
      { id: "kit200", label: "Kit Indústria 200+", range: "200 unidades ou mais", minQty: 200, maxQty: null, price: 169.9, discountPct: 32 },
    ],
    trustBadges: [
      { icon: "print", label: "Reforço Joelhos" },
      { icon: "dryfit", label: "Brim Pesado 280g" },
      { icon: "antiodor", label: "Refletivo Certificado" },
      { icon: "uv", label: "8 Bolsos Funcionais" },
    ],
    details: {
      material: "Brim profissional 280g/m² (67% poliéster / 33% algodão) com reforço duplo em pontos críticos.",
      fit: "Modelagem profissional folgada com elástico nas costas e cintura ajustável.",
      collar: "Colarinho clássico com fechamento em zíper YKK industrial coberto por aba com botões.",
      care: "Lavagem industrial até 60°C. Não usar alvejante.",
    },
    customization: "Logo bordado no peito + função/nome do colaborador. Bandeira do estado opcional na manga.",
    shipping: "Produção em 22 a 32 dias úteis. Ficha técnica e laudo de tecido inclusos.",
    reviews: [
      { id: "im1", name: "Op. Industrial Júlio M.", location: "Cubatão/SP", date: "fevereiro de 2025", rating: 5, text: "Aguenta turno de 12h sem rasgar. Reforço nos joelhos faz diferença.", avatar: avatar4 },
    ],
    whatsappNumber: "5511999999999",
  },
  // ===== Corridas =====
  {
    slug: "corridas-camiseta-tech",
    category: "corridas",
    name: "Camiseta Running Tech — Ultraleve",
    shortName: "Camiseta Running",
    tagline: "Zero peso a cada quilômetro. Tecido que respira de verdade.",
    basePrice: 119.9,
    rating: 4.9,
    reviewCount: 74,
    scarcityMessage: "Pacote para assessorias: layout grátis a partir de 15 atletas.",
    images: [
      { src: corridasCamiseta, alt: "Camiseta de corrida verde neon com painéis em mesh e detalhes refletivos" },
    ],
    sizes: { adult: ["PP", "P", "M", "G", "GG", "G1"], kids: ["10", "12", "14"] },
    tiers: [
      { id: "retail", label: "Avulso", range: "1 a 9 unidades", minQty: 1, maxQty: 9, price: 119.9, discountPct: 0 },
      { id: "kit15", label: "Kit Assessoria 15+", range: "15 a 49 unidades", minQty: 15, maxQty: 49, price: 89.9, discountPct: 25, recommended: true },
      { id: "kit50", label: "Kit Equipe 50+", range: "50 unidades ou mais", minQty: 50, maxQty: null, price: 74.9, discountPct: 37 },
    ],
    trustBadges: [
      { icon: "uv", label: "UV50+" },
      { icon: "dryfit", label: "Dry-Fit Pro" },
      { icon: "antiodor", label: "Antiodor" },
      { icon: "print", label: "Refletivos Noturnos" },
    ],
    details: {
      material: "Poliéster esportivo de baixa gramatura (130g/m²) com micro-furos para ventilação.",
      fit: "Modelagem athletic fit com costuras flatlock que não machucam em longas distâncias.",
      collar: "Gola redonda baixa em ribana fina.",
      care: "Lavar à máquina até 30°C. Não passar sobre os refletivos.",
    },
    customization: "Sublimação total: nome da assessoria, número, patrocinadores. Layout exclusivo grátis para 15+.",
    shipping: "Produção em 12 a 18 dias úteis após aprovação do layout.",
    reviews: [
      { id: "rc1", name: "Coach Lucas R.", location: "Pato Branco/PR", date: "março de 2025", rating: 5, text: "Vestimos a assessoria toda. Tecido leve e atendimento de outro nível.", avatar: avatar1 },
      { id: "rc2", name: "Mariana D.", location: "Curitiba/PR", date: "fevereiro de 2025", rating: 5, text: "Corremos a São Silvestre com a camisa do nosso grupo. Top demais.", avatar: avatar3 },
    ],
    whatsappNumber: "5511999999999",
  },
  {
    slug: "corridas-regata-pro",
    category: "corridas",
    name: "Regata Running Pro — Mesh Total",
    shortName: "Regata Running",
    tagline: "Para os dias quentes em que cada grama conta.",
    basePrice: 99.9,
    rating: 4.9,
    reviewCount: 51,
    scarcityMessage: "Coleção verão: produção limitada por mês.",
    images: [
      { src: corridasRegata, alt: "Regata preta de corrida com painéis mesh laranja neon nas laterais" },
    ],
    sizes: { adult: ["PP", "P", "M", "G", "GG", "G1"], kids: ["10", "12", "14"] },
    tiers: [
      { id: "retail", label: "Avulso", range: "1 a 9 unidades", minQty: 1, maxQty: 9, price: 99.9, discountPct: 0 },
      { id: "kit15", label: "Kit Assessoria 15+", range: "15 a 49 unidades", minQty: 15, maxQty: 49, price: 74.9, discountPct: 25, recommended: true },
      { id: "kit50", label: "Kit Equipe 50+", range: "50 unidades ou mais", minQty: 50, maxQty: null, price: 64.9, discountPct: 35 },
    ],
    trustBadges: [
      { icon: "uv", label: "UV50+" },
      { icon: "dryfit", label: "Mesh Ventilado" },
      { icon: "antiodor", label: "Antiodor" },
      { icon: "print", label: "Sublimação HD" },
    ],
    details: {
      material: "Mesh esportivo ultraleve (110g/m²) com painéis laterais em malha aberta para ventilação extra.",
      fit: "Athletic fit com cavas amplas e laterais ergonômicas.",
      collar: "Decote redondo baixo.",
      care: "Lavar à máquina até 30°C. Secar à sombra.",
    },
    customization: "Sublimação total nas cores e logos da assessoria.",
    shipping: "Produção em 12 a 18 dias úteis.",
    reviews: [
      { id: "rg1", name: "Tiago F.", location: "Maringá/PR", date: "janeiro de 2025", rating: 5, text: "Mais leve que tudo que já usei. Os mesh nas laterais salvam no calor.", avatar: avatar2 },
    ],
    whatsappNumber: "5511999999999",
  },
  {
    slug: "corridas-corta-vento-light",
    category: "corridas",
    name: "Corta-vento Running Light",
    shortName: "Corta-vento Light",
    tagline: "Compacto, leve e impermeável. Para os treinos de inverno.",
    basePrice: 199.9,
    rating: 5.0,
    reviewCount: 39,
    scarcityMessage: "Pacote completo de inverno: combine com camiseta tech.",
    images: [
      { src: corridasCortaVento, alt: "Corta-vento cinza grafite com zíper amarelo neon e detalhes refletivos" },
    ],
    sizes: { adult: ["P", "M", "G", "GG", "G1"], kids: [] },
    tiers: [
      { id: "retail", label: "Avulso", range: "1 a 9 unidades", minQty: 1, maxQty: 9, price: 199.9, discountPct: 0 },
      { id: "kit15", label: "Kit Assessoria 15+", range: "15 a 49 unidades", minQty: 15, maxQty: 49, price: 159.9, discountPct: 20, recommended: true },
      { id: "kit50", label: "Kit Equipe 50+", range: "50 unidades ou mais", minQty: 50, maxQty: null, price: 134.9, discountPct: 33 },
    ],
    trustBadges: [
      { icon: "print", label: "Detalhes Refletivos" },
      { icon: "dryfit", label: "Impermeável Leve" },
      { icon: "antiodor", label: "Compactável" },
      { icon: "uv", label: "Zíper YKK" },
    ],
    details: {
      material: "Tafetá técnico de poliéster com tratamento DWR repelente à água. Costuras seladas.",
      fit: "Slim fit técnico com punhos elásticos e barra com cordão regulável.",
      collar: "Gola alta com proteção de queixo e capuz dobrável no zíper.",
      care: "Lavar à máquina até 30°C. Não passar.",
    },
    customization: "Logo silk ou termocolante. Refletivo extra opcional nas mangas.",
    shipping: "Produção em 18 a 25 dias úteis.",
    reviews: [
      { id: "rcv1", name: "Felipe N.", location: "Curitiba/PR", date: "junho de 2024", rating: 5, text: "Salva nos treinos de inverno. Cabe no bolso e protege de verdade.", avatar: avatar4 },
    ],
    whatsappNumber: "5511999999999",
  },
];

export const formatBRL = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function getTierForQty(tiers: VolumeTier[], qty: number): VolumeTier {
  const safeQty = Math.max(1, qty);
  const match = tiers.find(
    (t) => safeQty >= t.minQty && (t.maxQty === null || safeQty <= t.maxQty),
  );
  return match ?? tiers[0];
}

export function getNextTier(tiers: VolumeTier[], qty: number): VolumeTier | null {
  const current = getTierForQty(tiers, qty);
  const idx = tiers.indexOf(current);
  return idx >= 0 && idx < tiers.length - 1 ? tiers[idx + 1] : null;
}
