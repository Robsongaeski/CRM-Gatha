import categoryAgroHero from "@/assets/site/category-hero-poster.jpg";
import categoryEsportivosHero from "@/assets/site/sports-hero.jpg";
import categoryTerceiraoHero from "@/assets/site/category-terceirao-hero.jpg";
import categoryEmpresarialHero from "@/assets/site/category-empresarial-hero.jpg";
import categoryIndustriaHero from "@/assets/site/category-industria-hero.jpg";
import categoryCorridasHero from "@/assets/site/category-corridas-hero.jpg";

export type CategoryTech = {
  icon: "wind" | "shield" | "scissors" | "palette" | "factory" | "zap" | "award" | "sparkles";
  title: string;
  description: string;
};

export type CategoryTestimonial = {
  id: string;
  quote: string;
  name: string;
  role: string;
};

export type CategoryConfig = {
  slug: string;
  name: string;
  shortName: string;
  /** Optional path. If absent, uses /categoria/{slug}. Used to keep /agro alias. */
  routePath?: string;
  hero: {
    image: string;
    eyebrow: string;
    title: string;
    titleAlt?: string;
    description: string;
    primaryCtaLabel: string;
  };
  tech: CategoryTech[];
  productSlugs: string[];
  testimonials: CategoryTestimonial[];
  whatsappMessage: string;
  whatsappNumber: string;
  /** Used in WhatsApp button label and B2B callout */
  consultantTitle: string;
  /** Headline + body for the B2B / volume callout */
  b2b: {
    eyebrow: string;
    title: string;
    description: string;
    bullets: string[];
    ctaLabel: string;
  };
  /** Tag color tint (used as accent dot in hub cards) */
  accent: "neutral" | "warm" | "cool" | "lime" | "amber" | "rose";
  /** Short tagline shown in the home hub card */
  hubTagline: string;
};

const WHATSAPP = "5511999999999";

export const categories: CategoryConfig[] = [
  {
    slug: "agro",
    name: "Agro & Campo",
    shortName: "Agro",
    routePath: "/categoria/agro",
    hero: {
      image: categoryAgroHero,
      eyebrow: "Coleção Agro · 2025",
      title: "Tecnologia que aguenta",
      titleAlt: "o dia inteiro no campo.",
      description:
        "Camisetas e uniformes técnicos com proteção UV50+, dry-fit e antiodor. Para quem trabalha de verdade.",
      primaryCtaLabel: "Ver Modelos e Preços",
    },
    tech: [
      { icon: "shield", title: "Proteção UV50+", description: "Bloqueio solar certificado para o dia inteiro de trabalho." },
      { icon: "wind", title: "Dry-Fit Pro", description: "Tecido respirável que seca rápido e dispersa o suor." },
      { icon: "sparkles", title: "Antiodor", description: "Tecnologia que neutraliza odores mesmo em jornadas longas." },
      { icon: "palette", title: "Estampa Toque Zero", description: "Sublimação que não racha, não pesa e não esquenta." },
    ],
    productSlugs: ["agrotech-performance-manga-longa"],
    testimonials: [
      { id: "a1", quote: "As camisas aguentaram o trabalho no sol o dia todo. Equipe inteira aprovou.", name: "Carlos M.", role: "Sorriso/MT" },
      { id: "a2", quote: "Pedi 30 unidades para a fazenda. Caimento ótimo e estampa do logo perfeita.", name: "Rafael S.", role: "Rio Verde/GO" },
      { id: "a3", quote: "Tecido leve, proteção UV de verdade e atendimento rápido pelo zap.", name: "Juliana A.", role: "Lucas do Rio Verde/MT" },
    ],
    whatsappMessage: "Olá! Quero um orçamento de uniformes para o agro.",
    whatsappNumber: WHATSAPP,
    consultantTitle: "Consultor Agro",
    b2b: {
      eyebrow: "Para fazendas e cooperativas",
      title: "Quanto mais, mais barato.",
      description: "Tabela escalonada com até 30% de desconto a partir de 50 peças. Logo aplicado por sublimação.",
      bullets: ["Logo grátis no peito", "Nota fiscal e prazo garantido", "Entrega rastreada nacional"],
      ctaLabel: "Falar com Consultor Agro",
    },
    accent: "warm",
    hubTagline: "Camisetas técnicas para o trabalho no campo.",
  },
  {
    slug: "esportivos",
    name: "Esportivos & Times",
    shortName: "Esportivos",
    hero: {
      image: categoryEsportivosHero,
      eyebrow: "Coleção Esportiva · 2025",
      title: "Vista a garra",
      titleAlt: "do seu time.",
      description:
        "Uniformes de alta performance com Dry-Fit e UV50+. Do interclasses ao profissional, com layout grátis para times.",
      primaryCtaLabel: "Ver Modelos e Preços",
    },
    tech: [
      { icon: "wind", title: "Dry-Fit Pro", description: "Gestão de suor e secagem ultrarrápida em qualquer intensidade." },
      { icon: "shield", title: "Proteção UV50+", description: "Bloqueio solar para treinos e jogos ao ar livre." },
      { icon: "scissors", title: "Costura Reforçada", description: "Resistência máxima para esportes de contato." },
      { icon: "palette", title: "Cores Infinitas", description: "Sublimação digital de alta definição. Não desbota." },
    ],
    productSlugs: ["uniforme-futebol-pro", "uniforme-volei-elite", "regata-basquete-court"],
    testimonials: [
      { id: "e1", quote: "Recebemos antes do prazo, estampa impecável e tecido leve. Time todo aprovou.", name: "Rafael Souza", role: "Capitão · Atlético Pato Branco" },
      { id: "e2", quote: "Organizei o interclasses de 8 turmas. Layout gratuito e atendimento direto.", name: "Profa. Marina Lopes", role: "Coordenadora de Ed. Física" },
      { id: "e3", quote: "Tecido respira de verdade. Joguei dois sets sem peso molhado.", name: "Camila Fernandes", role: "Líbero · Vôlei Sudoeste" },
    ],
    whatsappMessage: "Olá! Quero um orçamento de uniformes esportivos para o meu time.",
    whatsappNumber: WHATSAPP,
    consultantTitle: "Consultor de Uniformes",
    b2b: {
      eyebrow: "Pacote Interclasses & Times",
      title: "Layout grátis para times completos.",
      description: "Pedidos a partir de 10 peças ganham desenvolvimento de layout sem custo. Até 35% off no Kit Equipe.",
      bullets: ["Layout exclusivo grátis", "Nome + número por jogador", "Prazo de 12 a 18 dias úteis"],
      ctaLabel: "Falar com Consultor de Times",
    },
    accent: "cool",
    hubTagline: "Uniformes para futebol, vôlei, basquete e interclasses.",
  },
  {
    slug: "terceirao",
    name: "Terceirão & Formandos",
    shortName: "Terceirão",
    hero: {
      image: categoryTerceiraoHero,
      eyebrow: "Coleção Formandos · 2025",
      title: "A turma que vai",
      titleAlt: "ficar na história.",
      description:
        "Moletons, jaquetas e camisetas exclusivas para a sua turma. Layout assinado pela sua identidade, prazo garantido para a formatura.",
      primaryCtaLabel: "Montar Kit da Turma",
    },
    tech: [
      { icon: "palette", title: "Layout Exclusivo", description: "Designer dedicado para criar a identidade da sua turma." },
      { icon: "award", title: "Bordado Premium", description: "Acabamento que dura uma vida — e não desbota com o tempo." },
      { icon: "sparkles", title: "Tecido Premium", description: "Moleton flanelado e jaquetas com forro interno macio." },
      { icon: "zap", title: "Prazo Garantido", description: "Cronograma planejado para entregar antes da formatura." },
    ],
    productSlugs: ["terceirao-moletom-classico", "terceirao-jaqueta-college", "terceirao-camiseta-comemorativa"],
    testimonials: [
      { id: "t1", quote: "A turma toda chorou quando viu o moleton. Ficou nível profissional.", name: "Beatriz L.", role: "3º Ano · Colégio Dom Bosco" },
      { id: "t2", quote: "O layout que fizeram pra gente bombou no Insta. Vários colégios pediram referência.", name: "Pedro A.", role: "Comissão de Formatura" },
      { id: "t3", quote: "Entregaram 78 jaquetas no prazo combinado. Zero erro de tamanho ou nome.", name: "Profa. Clara M.", role: "Orientadora · Colégio Marista" },
    ],
    whatsappMessage: "Olá! Sou da comissão de formatura e quero um orçamento para a minha turma.",
    whatsappNumber: WHATSAPP,
    consultantTitle: "Consultor Formandos",
    b2b: {
      eyebrow: "Comissão de Formatura",
      title: "O kit que sua turma merece.",
      description: "Atendimento dedicado, layout grátis e parcelamento facilitado para turmas a partir de 25 alunos.",
      bullets: ["Designer dedicado à sua turma", "Parcelamento em até 12x", "Prazo blindado para a formatura"],
      ctaLabel: "Falar com Consultor Formandos",
    },
    accent: "amber",
    hubTagline: "Moletons, jaquetas e camisetas para sua turma.",
  },
  {
    slug: "empresarial",
    name: "Empresarial & Corporativo",
    shortName: "Empresarial",
    hero: {
      image: categoryEmpresarialHero,
      eyebrow: "Coleção Corporativa · 2025",
      title: "A imagem da sua",
      titleAlt: "marca, vestida.",
      description:
        "Polos, camisas sociais e jaquetas corporativas com bordado refinado. Para empresas que cuidam de cada detalhe.",
      primaryCtaLabel: "Ver Coleção Corporativa",
    },
    tech: [
      { icon: "award", title: "Bordado Premium", description: "Acabamento refinado que mantém o padrão da sua marca." },
      { icon: "wind", title: "Dry-Fit Corporativo", description: "Conforto em escritório, eventos e visitas externas." },
      { icon: "sparkles", title: "Caimento Slim", description: "Modelagem moderna que respeita silhueta masculina e feminina." },
      { icon: "palette", title: "Pantone Exato", description: "Reproduzimos a cor exata do seu manual de marca." },
    ],
    productSlugs: ["empresarial-polo-premium", "empresarial-camisa-social", "empresarial-jaqueta-softshell"],
    testimonials: [
      { id: "c1", quote: "Vestimos 120 colaboradores em 18 dias. Nota 10 no acabamento do bordado.", name: "Renata F.", role: "RH · Indústria Tech" },
      { id: "c2", quote: "Cor da marca reproduzida com fidelidade impressionante. Recomendo.", name: "Marcos T.", role: "Marketing · Construtora" },
      { id: "c3", quote: "Atendimento consultivo desde o briefing. Sentimos como parceiros.", name: "Aline R.", role: "Diretora de Operações" },
    ],
    whatsappMessage: "Olá! Quero um orçamento de uniforme corporativo para a minha empresa.",
    whatsappNumber: WHATSAPP,
    consultantTitle: "Consultor Corporativo",
    b2b: {
      eyebrow: "Para RH e Marketing",
      title: "Atendimento consultivo de ponta.",
      description: "Briefing dedicado, mock-ups, ficha técnica e nota fiscal. Pedidos recorrentes com tabela negociada.",
      bullets: ["Bordado e Pantone exato", "Nota fiscal e contrato", "Reposição programada anual"],
      ctaLabel: "Falar com Consultor Corporativo",
    },
    accent: "neutral",
    hubTagline: "Polos, camisas e jaquetas para sua empresa.",
  },
  {
    slug: "industria",
    name: "Indústria & Profissional",
    shortName: "Indústria",
    hero: {
      image: categoryIndustriaHero,
      eyebrow: "Coleção Industrial · 2025",
      title: "Resistência que",
      titleAlt: "trabalha por você.",
      description:
        "Camisas, coletes e macacões de alta visibilidade com refletivo e tecido reforçado. Para indústria, elétrica, solar e construção.",
      primaryCtaLabel: "Ver Linha Industrial",
    },
    tech: [
      { icon: "factory", title: "Tecido Reforçado", description: "Sarja pesada que aguenta lavagem industrial e atrito constante." },
      { icon: "zap", title: "Refletivo Certificado", description: "Faixas refletivas conforme NR para ambientes de risco." },
      { icon: "shield", title: "Alta Visibilidade", description: "Cores fluorescentes e tarjas para destaque em qualquer ambiente." },
      { icon: "scissors", title: "Costura Tripla", description: "Reforço em pontos críticos de tensão para vida útil estendida." },
    ],
    productSlugs: ["industria-camisa-hi-vis", "industria-colete-refletivo", "industria-macacao-trabalho"],
    testimonials: [
      { id: "i1", quote: "Uniforme aguenta lavagem industrial pesada e ainda mantém a cor. Diferencial.", name: "Eng. Ricardo P.", role: "Indústria Metalúrgica" },
      { id: "i2", quote: "Equipe de instalação solar usa todo dia. Refletivo de qualidade real.", name: "André S.", role: "Empresa de Energia Solar" },
      { id: "i3", quote: "Pedimos 200 macacões. Caimento padronizado e nada de defeito.", name: "Karen M.", role: "Compras · Construtora" },
    ],
    whatsappMessage: "Olá! Quero um orçamento de uniformes industriais e EPIs.",
    whatsappNumber: WHATSAPP,
    consultantTitle: "Consultor Industrial",
    b2b: {
      eyebrow: "Para indústria, elétrica e solar",
      title: "Volume e recorrência negociados.",
      description: "Contratos de fornecimento com tabela exclusiva, ficha técnica e laudo de tecido a partir de 100 peças.",
      bullets: ["Ficha técnica e laudos", "Refletivo certificado", "Reposição mensal programada"],
      ctaLabel: "Falar com Consultor Industrial",
    },
    accent: "amber",
    hubTagline: "Camisas, coletes e macacões para o trabalho pesado.",
  },
  {
    slug: "corridas",
    name: "Corridas & Performance",
    shortName: "Corridas",
    hero: {
      image: categoryCorridasHero,
      eyebrow: "Coleção Running · 2025",
      title: "A pegada certa,",
      titleAlt: "a cada quilômetro.",
      description:
        "Camisetas, regatas e corta-ventos para assessorias esportivas, ranchos de corrida e atletas amadores.",
      primaryCtaLabel: "Ver Coleção Running",
    },
    tech: [
      { icon: "wind", title: "Tecido Ultraleve", description: "Trama respirável de baixa gramatura para zero peso no movimento." },
      { icon: "sparkles", title: "Detalhes Refletivos", description: "Visibilidade extra em treinos noturnos e ao amanhecer." },
      { icon: "shield", title: "Proteção UV50+", description: "Bloqueio solar para longas distâncias ao ar livre." },
      { icon: "palette", title: "Sublimação HD", description: "Cores vivas que não desbotam após dezenas de lavagens." },
    ],
    productSlugs: ["corridas-camiseta-tech", "corridas-regata-pro", "corridas-corta-vento-light"],
    testimonials: [
      { id: "r1", quote: "Vestimos a assessoria toda. Tecido leve e atendimento de outro nível.", name: "Coach Lucas R.", role: "Assessoria Run Pato Branco" },
      { id: "r2", quote: "Corremos a São Silvestre com a camisa do nosso grupo. Top demais.", name: "Mariana D.", role: "Atleta amadora" },
      { id: "r3", quote: "O corta-vento salva nos treinos de inverno. Compacto e leve.", name: "Felipe N.", role: "Triatleta amador" },
    ],
    whatsappMessage: "Olá! Quero um orçamento de uniformes para corrida / assessoria esportiva.",
    whatsappNumber: WHATSAPP,
    consultantTitle: "Consultor Running",
    b2b: {
      eyebrow: "Assessorias e ranchos de corrida",
      title: "Identidade visual para o seu grupo.",
      description: "Pacotes para assessorias com layout dedicado e desconto progressivo a partir de 15 atletas.",
      bullets: ["Layout exclusivo da assessoria", "Tabela escalonada por atleta", "Reposição rápida para novas turmas"],
      ctaLabel: "Falar com Consultor Running",
    },
    accent: "lime",
    hubTagline: "Camisetas e regatas para assessorias e atletas.",
  },
];

export function getCategoryBySlug(slug: string): CategoryConfig | undefined {
  return categories.find((c) => c.slug === slug);
}
