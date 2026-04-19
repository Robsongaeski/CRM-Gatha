import productFront from "@/assets/site/product-front.jpg";
import productMc from "@/assets/site/product-mc.jpg";
import productPolo from "@/assets/site/product-polo.jpg";
import ugc1 from "@/assets/site/ugc-1.jpg";
import ugc2 from "@/assets/site/ugc-2.jpg";
import ugc3 from "@/assets/site/ugc-3.jpg";
import ugc4 from "@/assets/site/ugc-4.jpg";

export type TechFeature = {
  icon: "sun" | "droplets" | "sparkles" | "scissors";
  title: string;
  description: string;
};

export type UgcReview = {
  id: string;
  photo: string;
  name: string;
  company: string;
  quote: string;
};

export type CategoryProduct = {
  slug: string;
  image: string;
  badge: string;
  name: string;
  tagline: string;
  basePrice: number;
  fromPrice: number;
  fromMinQty: number;
};

export const techFeatures: TechFeature[] = [
  {
    icon: "sun",
    title: "Filtro UV50+",
    description: "Bloqueia 98% dos raios solares no campo aberto.",
  },
  {
    icon: "droplets",
    title: "Secagem Ultrarrápida",
    description: "Dry-fit que evapora o suor antes de pesar.",
  },
  {
    icon: "sparkles",
    title: "Estampa Toque Zero",
    description: "Sublimação no fio. Não racha, não descasca.",
  },
  {
    icon: "scissors",
    title: "Modelagem Premium",
    description: "Corte raglan que acompanha cada movimento.",
  },
];

export const ugcReviews: UgcReview[] = [
  {
    id: "u1",
    photo: ugc1,
    name: "Carlos Mendes",
    company: "Fazenda Boa Vista · Sorriso/MT",
    quote: "A melhor camisa que já usamos na fazenda.",
  },
  {
    id: "u2",
    photo: ugc2,
    name: "Juliana Alves",
    company: "AgroSul Consultoria · Lucas do Rio Verde/MT",
    quote: "Tecido leve, proteção UV de verdade. Atendimento impecável.",
  },
  {
    id: "u3",
    photo: ugc3,
    name: "Antônio Ribeiro",
    company: "Pecuária RB · Barreiras/BA",
    quote: "Trabalho com gado o dia todo e ela respira de verdade.",
  },
  {
    id: "u4",
    photo: ugc4,
    name: "Equipe Rio Verde",
    company: "Cooperativa COMIGO · Rio Verde/GO",
    quote: "30 unidades para a equipe. Caimento perfeito e estampa impecável.",
  },
];

export const categoryProducts: CategoryProduct[] = [
  {
    slug: "agrotech-performance-manga-longa",
    image: productFront,
    badge: "Mais Vendido",
    name: "AgroTech Performance — Manga Longa UV50+",
    tagline: "Tecnologia que aguenta o dia inteiro no campo.",
    basePrice: 119.9,
    fromPrice: 83.93,
    fromMinQty: 50,
  },
  {
    slug: "agrotech-performance-manga-longa",
    image: productMc,
    badge: "Novo",
    name: "AgroTech Performance — Manga Curta",
    tagline: "Leveza e respirabilidade para os dias mais quentes.",
    basePrice: 99.9,
    fromPrice: 69.93,
    fromMinQty: 50,
  },
  {
    slug: "agrotech-performance-manga-longa",
    image: productPolo,
    badge: "Premium",
    name: "AgroTech Polo — Equipe & Visita",
    tagline: "Para receber clientes e representar sua marca no campo.",
    basePrice: 139.9,
    fromPrice: 97.93,
    fromMinQty: 50,
  },
];

export const HERO_VIDEO_URL = ""; // Plug a hosted MP4 URL here when available
export const WHATSAPP_NUMBER = "5511999999999";
