import { portfolio as fallbackPortfolio, type Project } from "../data/portfolio";
import { supabase } from "./supabase";

export type PortfolioContent = typeof fallbackPortfolio;

export type PortfolioLoadResult = {
  portfolio: PortfolioContent;
  source: "static" | "supabase";
  error?: string;
};

type SiteSectionRow = {
  section_key: string;
  step: string | null;
  title: string | null;
  description: string | null;
  status: string | null;
};

type ProjectRow = {
  id: string;
  title: string | null;
  type: string | null;
  summary: string | null;
  description: string | null;
  url: string | null;
  tags: string[] | null;
  sort_order: number | null;
  is_hero_featured: boolean | null;
};

type ProjectImageRow = {
  project_id: string;
  public_url: string | null;
  alt_text: string | null;
  sort_order: number | null;
  is_cover: boolean | null;
  show_in_gallery: boolean | null;
  status: string | null;
};

type BrandItemRow = {
  name: string | null;
  sort_order: number | null;
  status: string | null;
};

type SiteAssetRow = {
  asset_key: string | null;
  public_url: string | null;
  status: string | null;
};

type PortfolioRpcProjectImage = {
  public_url?: string | null;
  alt_text?: string | null;
  sort_order?: number | null;
  is_cover?: boolean | null;
  show_in_gallery?: boolean | null;
};

type PortfolioRpcProject = {
  title?: string | null;
  type?: string | null;
  summary?: string | null;
  description?: string | null;
  url?: string | null;
  tags?: string[] | null;
  sort_order?: number | null;
  is_hero_featured?: boolean | null;
  images?: PortfolioRpcProjectImage[] | null;
};

type PortfolioRpcContent = {
  projectSection?: {
    step?: string | null;
    title?: string | null;
    description?: string | null;
    status?: string | null;
  } | null;
  brands?: string[] | null;
  projects?: PortfolioRpcProject[] | null;
  assets?: Record<string, string | null> | null;
};

function rowErrorMessage(error: { message?: string } | null | undefined) {
  return error?.message || "Nao foi possivel carregar os dados do Supabase.";
}

function sortByOrder<T extends { sort_order: number | null }>(items: T[]) {
  return [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

function withFallbackImages(projects: Project[]) {
  return projects.length > 0 ? projects : fallbackPortfolio.projects;
}

function mergeRpcContent(content: PortfolioRpcContent): PortfolioContent {
  const section = content.projectSection;
  const assets = content.assets || {};
  const projects = (content.projects || []).map((project) => {
    const images = [...(project.images || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const publicImages = images.map((image) => image.public_url).filter((url): url is string => Boolean(url));
    const galleryImages = images
      .filter((image) => image.show_in_gallery !== false)
      .map((image) => image.public_url)
      .filter((url): url is string => Boolean(url));

    return {
      title: project.title || "Projeto sem titulo",
      type: project.type || "",
      summary: project.summary || "",
      description: project.description || "",
      url: project.url || undefined,
      tags: Array.isArray(project.tags) ? project.tags.filter(Boolean) : [],
      images: publicImages,
      galleryImages,
      isHeroFeatured: Boolean(project.is_hero_featured),
    } satisfies Project;
  });

  return {
    ...fallbackPortfolio,
    person: {
      ...fallbackPortfolio.person,
      avatar: assets.profile_avatar || fallbackPortfolio.person.avatar,
    },
    resume: {
      ...fallbackPortfolio.resume,
      file: assets.resume_file || fallbackPortfolio.resume.file,
    },
    projectSection: {
      ...fallbackPortfolio.projectSection,
      step: section?.step || fallbackPortfolio.projectSection.step,
      title: section?.title || fallbackPortfolio.projectSection.title,
      description: section?.description || fallbackPortfolio.projectSection.description,
      status: section?.status === "hidden" ? "hidden" : "active",
    },
    brands: content.brands?.filter(Boolean) || fallbackPortfolio.brands,
    projects: withFallbackImages(projects),
  };
}

export async function loadPortfolioContent(): Promise<PortfolioLoadResult> {
  if (!supabase) {
    return { portfolio: fallbackPortfolio, source: "static" };
  }

  const rpcResult = await supabase.rpc("get_portfolio_content");
  if (!rpcResult.error && rpcResult.data) {
    return { portfolio: mergeRpcContent(rpcResult.data as PortfolioRpcContent), source: "supabase" };
  }

  const [sectionResult, brandResult, projectResult, imageResult, assetResult] = await Promise.all([
    supabase
      .from("site_sections")
      .select("section_key, step, title, description, status")
      .eq("section_key", "projects")
      .maybeSingle<SiteSectionRow>(),
    supabase.from("brand_items").select("name, sort_order, status").eq("status", "active").order("sort_order"),
    supabase
      .from("projects")
      .select("id, title, type, summary, description, url, tags, sort_order, is_hero_featured")
      .eq("is_published", true)
      .order("sort_order"),
    supabase
      .from("project_images")
      .select("project_id, public_url, alt_text, sort_order, is_cover, show_in_gallery, status")
      .eq("status", "active")
      .order("sort_order"),
    supabase.from("site_assets").select("asset_key, public_url, status").eq("status", "active"),
  ]);

  const firstError =
    sectionResult.error || brandResult.error || projectResult.error || imageResult.error || assetResult.error;

  if (firstError) {
    return { portfolio: fallbackPortfolio, source: "static", error: rowErrorMessage(firstError) };
  }

  const section = sectionResult.data;
  const brands = sortByOrder((brandResult.data || []) as BrandItemRow[])
    .map((brand) => brand.name?.trim())
    .filter((brand): brand is string => Boolean(brand));

  const imagesByProject = new Map<string, ProjectImageRow[]>();
  ((imageResult.data || []) as ProjectImageRow[]).forEach((image) => {
    const current = imagesByProject.get(image.project_id) || [];
    current.push(image);
    imagesByProject.set(image.project_id, current);
  });

  const projects = ((projectResult.data || []) as ProjectRow[]).map((project) => {
    const images = sortByOrder(imagesByProject.get(project.id) || []);
    const publicImages = images.map((image) => image.public_url).filter((url): url is string => Boolean(url));
    const galleryImages = images
      .filter((image) => image.show_in_gallery !== false)
      .map((image) => image.public_url)
      .filter((url): url is string => Boolean(url));

    return {
      title: project.title || "Projeto sem titulo",
      type: project.type || "",
      summary: project.summary || "",
      description: project.description || "",
      url: project.url || undefined,
      tags: Array.isArray(project.tags) ? project.tags.filter(Boolean) : [],
      images: publicImages,
      galleryImages,
      isHeroFeatured: Boolean(project.is_hero_featured),
    } satisfies Project;
  });

  const assets = ((assetResult.data || []) as SiteAssetRow[]).reduce<Record<string, string>>((acc, asset) => {
    if (asset.asset_key && asset.public_url) acc[asset.asset_key] = asset.public_url;
    return acc;
  }, {});

  const mergedPortfolio: PortfolioContent = {
    ...fallbackPortfolio,
    person: {
      ...fallbackPortfolio.person,
      avatar: assets.profile_avatar || fallbackPortfolio.person.avatar,
    },
    resume: {
      ...fallbackPortfolio.resume,
      file: assets.resume_file || fallbackPortfolio.resume.file,
    },
    projectSection: {
      ...fallbackPortfolio.projectSection,
      step: section?.step || fallbackPortfolio.projectSection.step,
      title: section?.title || fallbackPortfolio.projectSection.title,
      description: section?.description || fallbackPortfolio.projectSection.description,
      status: section?.status === "hidden" ? "hidden" : "active",
    },
    brands: brands.length > 0 ? brands : fallbackPortfolio.brands,
    projects: withFallbackImages(projects),
  };

  return { portfolio: mergedPortfolio, source: "supabase" };
}
