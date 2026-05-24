// Conteúdo editável do portfólio.
// Para alterar textos, links, marcas ou imagens, edite somente este arquivo.
// Coloque novas imagens em public/assets/projects/<nome-do-projeto>/ e adicione o caminho no array images.

export type Project = {
  title: string;
  type: string;
  summary: string;
  description: string;
  url?: string;
  tags: string[];
  images: string[];
  galleryImages?: string[];
  isHeroFeatured?: boolean;
};

export type OptionalSection = {
  title: string;
  status: "active" | "needs-real-data" | "hidden";
  note: string;
};

export type ProjectSection = {
  step: string;
  title: string;
  description?: string;
  status: "active" | "hidden";
};

export type SocialLink = {
  label: string;
  url: string;
  icon: "facebook" | "instagram" | "linkedin" | "pinterest";
  status: "active" | "needs-real-url";
};

const asset = (path: string) => `/assets/projects/${path}`;

export const portfolio = {
  person: {
    name: "Moises Gomes",
    role: "Web Designer",
    email: "mssmoises0102@gmail.com",
    secondaryEmail: "mss_moises@hotmail.com",
    phone: "+55 11 97733-6338",
    whatsappDigits: "5511977336338",
    avatar: "/assets/profile/moises-gomes.png",
  },
  socialLinks: [
    {
      label: "Facebook",
      url: "https://www.facebook.com/mss.moises",
      icon: "facebook",
      status: "active",
    },
    {
      label: "Instagram",
      url: "https://instagram.com/mss.moises",
      icon: "instagram",
      status: "active",
    },
    {
      label: "Pinterest",
      url: "https://www.pinterest.com/mssmoises/",
      icon: "pinterest",
      status: "active",
    },
    {
      label: "LinkedIn",
      url: "https://br.linkedin.com/pub/moises-gomes/41/320/a2",
      icon: "linkedin",
      status: "active",
    },
  ] as SocialLink[],
  hero: {
    eyebrow: "Design gráfico, web design e mídia online",
    title: "Sites, landing pages e peças visuais com clareza, ritmo e acabamento.",
    intro:
      "Sou Moises Gomes. Crio websites, banners, hot sites, landing pages, interfaces visuais e materiais impressos desde um flyer a uma estrutura complexa para ponto de venda.",
  },
  about: {
    title: "Sou Moises do Carmo Gomes",
    paragraphs: [
      "Designer gráfico formado, com especialização em Planejamento e Produção de Mídia Online.",
      "Criativo, comunicativo e comprometido com todos os trabalhos, busco atender de forma simples e objetiva.",
      "Prezo pela interação e pelo detalhamento da comunicação durante o desenvolvimento dos projetos para chegar ao resultado desejado.",
    ],
  },
  education: [
    {
      title: "Design gráfico",
      text: "Formação em Design Gráfico, com atuação em criação visual para peças digitais, materiais impressos e comunicação de marca.",
    },
    {
      title: "Mídia online",
      text: "Especialização em Planejamento e Produção de Mídia Online, conectando design, presença digital e comunicação para web.",
    },
    {
      title: "Experiência prática",
      text: "Vivência com websites, landing pages, banners, hot sites, social media, interfaces visuais e materiais promocionais.",
    },
  ],
  resume: {
    title: "Currículo profissional",
    summary:
      "Quer conhecer minha trajetória com mais detalhes? Deixei o PDF pronto para consulta.",
    file: "/assets/documents/curriculo-moises-gomes.pdf",
  },
  services: [
    "Websites",
    "Landing pages",
    "Hot sites",
    "Interfaces visuais",
    "Banners para sites e social media",
    "Logotipos e marcas",
    "Cartão de visita e papelaria",
    "Folders, folhetos e livros",
    "Outdoors, totens e PDV",
    "Projetos especiais e diferenciados",
  ],
  process: [
    {
      title: "Escuta e direção",
      text: "Entendimento do objetivo, público e materiais já existentes antes de transformar a ideia em layout.",
    },
    {
      title: "Design visual",
      text: "Criação das telas e peças com foco em hierarquia, legibilidade, responsividade e consistência de marca.",
    },
    {
      title: "Ajustes e entrega",
      text: "Refinamento junto ao cliente e organização dos arquivos finais para uso em web, mídia ou impressos.",
    },
  ],
  recommendations: [
    {
      title: "Mini cases por projeto",
      text: "Adicionar objetivo, desafio, papel do Moises e entregas em cada projeto quando essas informações forem confirmadas.",
    },
    {
      title: "Antes e depois",
      text: "Mostrar comparativos de layout, peças ou telas reformuladas para evidenciar evolução visual sem depender de números.",
    },
    {
      title: "Ferramentas e fluxo",
      text: "Listar softwares, plataformas e etapas de trabalho usadas no dia a dia, apenas com informações reais.",
    },
    {
      title: "Depoimentos autorizados",
      text: "Incluir falas curtas de clientes com autorização, cargo e empresa quando permitido.",
    },
    {
      title: "Métricas comprovadas",
      text: "Quando houver dados reais, incluir alcance, volume de peças, conversão ou outros indicadores verificáveis.",
    },
  ],
  brands: [
    "Oakley",
    "Heliar",
    "Souza Cruz",
    "Mattel",
    "Flamengo - Clube de Regatas do Flamengo",
    "Weleda",
    "Trend Foods",
    "Gendai",
    "China in Box",
  ],
  projectSection: {
    step: "03",
    title: "Projetos selecionados.",
    description: "",
    status: "active",
  } as ProjectSection,
  projects: [
    {
      title: "On My Way Travel",
      type: "Site institucional",
      summary: "Website para empresa jovem e criativa de turismo e serviços.",
      description:
        "Criada a partir da paixão por diferentes culturas e nacionalidades, a On My Way Travel é uma empresa jovem, criativa e cheia de energia. A busca por excelência nos serviços prestados ajudou a marca a se consolidar no mercado de turismo e serviços.",
      url: "http://omwtravel.com.br",
      tags: ["Turismo", "Site", "Institucional"],
      images: [
        asset("on-my-way-travel/1.avif"),
        asset("on-my-way-travel/2.avif"),
        asset("on-my-way-travel/3.avif"),
        asset("on-my-way-travel/4.avif"),
        asset("on-my-way-travel/5.avif"),
      ],
      isHeroFeatured: true,
    },
    {
      title: "Gendai",
      type: "Site e mídia digital",
      summary: "Peças e telas digitais para marca do segmento de alimentação.",
      description:
        "Desde 2009, o GENDAI é reconhecido pela Associação Brasileira de Franchising como uma das melhores redes de franquias do Brasil. O Selo de Excelência em Franchising é concedido anualmente às franqueadoras que mantêm qualidade e excelência na relação com seus franqueados.",
      url: "https://www.gendai.com.br",
      tags: ["Food service", "Site", "Mídia digital"],
      images: [
        asset("gendai/1.avif"),
        asset("gendai/2.avif"),
        asset("gendai/3.avif"),
        asset("gendai/c1043c_2437998ef14846a3b1e21d771190c844~mv2.avif"),
        asset("gendai/c1043c_2d00343095f949179ecfd94ca24a2590~mv2.avif"),
        asset("gendai/c1043c_3ee498d9a9bf454e88024322e711d2ed~mv2.avif"),
        asset("gendai/c1043c_4d22b80fa1294d90a6503a6980f3db89~mv2.avif"),
        asset("gendai/c1043c_556fc9e439a94f18ac3f410688a0976e~mv2.avif"),
        asset("gendai/c1043c_608c88a730f64ef38f4029f46d528f9b~mv2.avif"),
        asset("gendai/c1043c_6243cd7747e8489fb7c5c0549de8e7a1~mv2.avif"),
        asset("gendai/c1043c_6e9c9c2f33ee433d836f63edbd17d82b~mv2.avif"),
        asset("gendai/c1043c_8d4dc579a6d545d1b7e8b28efde910c7~mv2.avif"),
        asset("gendai/c1043c_92885007f188438288b77750731752b6~mv2.avif"),
        asset("gendai/c1043c_9cbb0f8ada404632a69ea96caf97d832~mv2.avif"),
        asset("gendai/c1043c_a500de7b850249dbbedad3c220d59ff0~mv2.avif"),
        asset("gendai/c1043c_a7b67b745a304250919847ba58982ca3~mv2.avif"),
        asset("gendai/c1043c_b85c92d7606545d0ab19f01511164033~mv2.avif"),
        asset("gendai/c1043c_be760a054c104f28a2400af6807e46d3~mv2.avif"),
      ],
    },
    {
      title: "China in Box",
      type: "Mídia digital",
      summary: "Peças digitais e materiais de campanha para social media.",
      description:
        "Conjunto de peças visuais para China in Box, com materiais de campanha e comunicação digital.",
      tags: ["Social media", "Campanha", "Midia"],
      images: [
        asset("china-in-box/1.avif"),
        asset("china-in-box/2.avif"),
        asset("china-in-box/c1043c_0956e57a553c47c3963ace2a0da44e13~mv2.avif"),
        asset("china-in-box/c1043c_7cfb61d5110841e9a8c1d752a54a3076~mv2.avif"),
        asset("china-in-box/c1043c_faa3340bc88442d5854754611fe758e0~mv2.avif"),
      ],
    },
  ] as Project[],
  optionalSections: [
    {
      title: "Métricas reais",
      status: "needs-real-data",
      note: "Adicionar apenas números comprovados, como aumento de conversão, alcance ou volume de peças entregues.",
    },
    {
      title: "Depoimentos",
      status: "needs-real-data",
      note: "Adicionar falas autorizadas de clientes reais, com nome/cargo quando permitido.",
    },
    {
      title: "Ferramentas",
      status: "needs-real-data",
      note: "Adicionar softwares e plataformas usadas no trabalho, como editores, CMS, prototipagem ou mídia.",
    },
  ] as OptionalSection[],
};
