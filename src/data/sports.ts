import sportSoccer from "@/assets/site/sport-soccer.jpg";
import sportVolleyball from "@/assets/site/sport-volleyball.jpg";
import sportBasketball from "@/assets/site/sport-basketball.jpg";

export type Modality = {
  key: string;
  label: string;
  icon: "soccer" | "volleyball" | "basketball" | "tennis" | "trophy" | "dumbbell";
};

export type SportTech = {
  icon: "wind" | "shield-sun" | "scissors" | "palette";
  title: string;
  description: string;
};

export type SportProduct = {
  slug: string;
  image: string;
  badge: string;
  modality: string;
  name: string;
  tagline: string;
  basePrice: number;
  team10Price: number;
  team20Price: number;
};

export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  role: string;
};

export const SPORTS_HERO_VIDEO_URL = ""; // Plug a hosted MP4 URL here

export const modalities: Modality[] = [
  { key: "futebol", label: "Futebol", icon: "soccer" },
  { key: "volei", label: "Vôlei", icon: "volleyball" },
  { key: "basquete", label: "Basquete", icon: "basketball" },
  { key: "tenis", label: "Tênis", icon: "tennis" },
  { key: "interclasses", label: "Interclasses", icon: "trophy" },
  { key: "treino", label: "Treino", icon: "dumbbell" },
];

export const sportTech: SportTech[] = [
  {
    icon: "wind",
    title: "Dry-Fit Pro",
    description: "Gestão de suor e secagem ultrarrápida em qualquer intensidade.",
  },
  {
    icon: "shield-sun",
    title: "Proteção UV50+",
    description: "Bloqueio solar para treinos e jogos ao ar livre, o dia todo.",
  },
  {
    icon: "scissors",
    title: "Costura Reforçada",
    description: "Resistência máxima para esportes de contato e disputa pesada.",
  },
  {
    icon: "palette",
    title: "Cores Infinitas",
    description: "Sublimação digital de alta definição. Não desbota, não racha.",
  },
];

export const sportProducts: SportProduct[] = [
  {
    slug: "uniforme-futebol-pro",
    image: sportSoccer,
    badge: "Mais Vendido para Times",
    modality: "Futebol",
    name: "Camisa Futebol Pro — Sublimada",
    tagline: "Modelagem oficial, leve e respirável. Personalização total.",
    basePrice: 129.9,
    team10Price: 99.9,
    team20Price: 84.9,
  },
  {
    slug: "uniforme-volei-elite",
    image: sportVolleyball,
    badge: "Top Interclasses",
    modality: "Vôlei",
    name: "Camisa Vôlei Elite — Raglan",
    tagline: "Corte raglan com painéis laterais para máxima mobilidade.",
    basePrice: 119.9,
    team10Price: 92.9,
    team20Price: 79.9,
  },
  {
    slug: "regata-basquete-court",
    image: sportBasketball,
    badge: "Novo",
    modality: "Basquete",
    name: "Regata Basquete Court — Mesh",
    tagline: "Tecido mesh ultraleve com acabamento profissional.",
    basePrice: 109.9,
    team10Price: 84.9,
    team20Price: 72.9,
  },
];

export const sportTestimonials: Testimonial[] = [
  {
    id: "t1",
    quote:
      "Recebemos os uniformes antes do prazo, a estampa é impecável e o tecido é muito leve. O time todo adorou!",
    name: "Rafael Souza",
    role: "Capitão · Atlético Pato Branco",
  },
  {
    id: "t2",
    quote:
      "Organizei o interclasses de 8 turmas. Layout gratuito, atendimento direto e desconto pra quantidade. Salvou.",
    name: "Profa. Marina Lopes",
    role: "Coordenadora de Educação Física",
  },
  {
    id: "t3",
    quote:
      "Tecido respira de verdade. Joguei dois sets sem aquela sensação de peso molhado. Recomendo demais.",
    name: "Camila Fernandes",
    role: "Líbero · Vôlei Sudoeste",
  },
];

export const SPORTS_WHATSAPP_NUMBER = "5511999999999";
