import React, { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import ReactDOM from "react-dom/client";
import type { Session } from "@supabase/supabase-js";
import {
  FolderKanban,
  Image as ImageIcon,
  LogOut,
  Plus,
  Save,
  Settings,
  Trash2,
  Upload,
} from "lucide-react";
import { ADMIN_EMAIL, STORAGE_BUCKET, hasSupabaseConfig, supabase } from "./lib/supabase";
import "./admin.css";

type Status = "active" | "hidden";

type AdminSection = {
  id?: string;
  section_key: "projects";
  step: string;
  title: string;
  description: string | null;
  status: Status;
};

type BrandItem = {
  id: string;
  name: string;
  sort_order: number;
  status: Status;
};

type AdminProject = {
  id: string;
  slug: string;
  title: string;
  type: string;
  summary: string;
  description: string;
  url: string;
  tags: string[];
  sort_order: number;
  is_published: boolean;
  is_hero_featured: boolean;
};

type ProjectImage = {
  id: string;
  project_id: string;
  storage_path: string;
  public_url: string;
  alt_text: string;
  sort_order: number;
  is_cover: boolean;
  show_in_gallery: boolean;
  status: Status;
};

type SiteAsset = {
  id: string;
  asset_key: string;
  label: string;
  storage_path: string;
  public_url: string;
  alt_text: string;
  status: Status;
};

type AdminRpcContent = {
  projectSection?: Partial<AdminSection> | null;
  brandItems?: Partial<BrandItem>[] | null;
  projects?: (Partial<AdminProject> & { images?: Partial<ProjectImage>[] | null })[] | null;
  siteAssets?: Partial<SiteAsset>[] | null;
};

type AdminTab = "section" | "projects" | "images" | "assets";

const defaultSection: AdminSection = {
  section_key: "projects",
  step: "03",
  title: "Projetos selecionados.",
  description: "",
  status: "active",
};

const knownAssets = [
  { key: "profile_avatar", label: "Foto de perfil" },
  { key: "resume_file", label: "Curriculo PDF" },
];

function localId() {
  return `local-${crypto.randomUUID()}`;
}

function slugify(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "projeto"
  );
}

function sanitizeFileName(value: string) {
  const parts = value.split(".");
  const extension = parts.length > 1 ? `.${parts.pop()?.toLowerCase()}` : "";
  const base = slugify(parts.join(".") || "arquivo");
  return `${Date.now()}-${base}${extension}`;
}

function emptyProject(order: number): AdminProject {
  return {
    id: "",
    slug: "",
    title: "",
    type: "",
    summary: "",
    description: "",
    url: "",
    tags: [],
    sort_order: order,
    is_published: true,
    is_hero_featured: false,
  };
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function isImageUrl(url: string) {
  return /\.(avif|webp|jpe?g|png)(\?|$)/i.test(url);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) return String(error.message);
  return "Nao foi possivel concluir a acao.";
}

function normalizeStatus(value: unknown): Status {
  return value === "hidden" ? "hidden" : "active";
}

function LoadingIndicator({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="admin-loading" role="status" aria-live="polite">
      <span className="admin-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

function AdminApp() {
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<AdminTab>("section");
  const [section, setSection] = useState<AdminSection>(defaultSection);
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [projectDraft, setProjectDraft] = useState<AdminProject>(emptyProject(10));
  const [images, setImages] = useState<ProjectImage[]>([]);
  const [assets, setAssets] = useState<SiteAsset[]>([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [customAssetKey, setCustomAssetKey] = useState("");
  const [customAssetLabel, setCustomAssetLabel] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) || projects[0],
    [activeProjectId, projects],
  );

  const projectImages = useMemo(
    () => images.filter((image) => image.project_id === activeProject?.id),
    [activeProject?.id, images],
  );

  async function verifyAdmin() {
    const client = supabase;
    if (!client) return false;

    const { data, error: adminError } = await client.rpc("is_portfolio_admin");
    if (adminError) throw adminError;
    return data === true;
  }

  function applyAdminState(
    sectionData: AdminSection | null,
    brandData: BrandItem[],
    projectData: AdminProject[],
    imageData: ProjectImage[],
    assetData: SiteAsset[],
  ) {
    setSection(sectionData || defaultSection);
    setBrands(brandData);
    setProjects(projectData);
    setImages(imageData);
    setAssets(assetData);

    if (projectData.length > 0) {
      const selectedProject = projectData.find((project) => project.id === activeProjectId) || projectData[0];
      setActiveProjectId(selectedProject.id);
      setProjectDraft((current) =>
        current.id && projectData.some((project) => project.id === current.id)
          ? projectData.find((project) => project.id === current.id) || selectedProject
          : selectedProject,
      );
    } else {
      setProjectDraft(emptyProject(10));
      setActiveProjectId("");
    }
  }

  async function loadAdminDataFromRpc() {
    const client = supabase;
    if (!client) return false;

    const { data, error: rpcError } = await client.rpc("admin_get_portfolio_content");
    if (rpcError || !data) return false;

    const content = data as AdminRpcContent;
    if ("error" in content) return false;
    const rpcSection = content.projectSection;
    const rpcProjects = content.projects || [];
    const projectData = rpcProjects
      .filter((project) => project.id)
      .map(
        (project) =>
          ({
            id: String(project.id),
            slug: project.slug || slugify(project.title || "projeto"),
            title: project.title || "Projeto sem titulo",
            type: project.type || "",
            summary: project.summary || "",
            description: project.description || "",
            url: project.url || "",
            tags: Array.isArray(project.tags) ? project.tags.filter(Boolean) : [],
            sort_order: Number(project.sort_order) || 0,
            is_published: project.is_published !== false,
            is_hero_featured: Boolean(project.is_hero_featured),
          }) satisfies AdminProject,
      );
    const imageData = rpcProjects.flatMap((project) =>
      (project.images || [])
        .filter((image) => image.id && image.project_id)
        .map(
          (image) =>
            ({
              id: String(image.id),
              project_id: String(image.project_id),
              storage_path: image.storage_path || "",
              public_url: image.public_url || "",
              alt_text: image.alt_text || "",
              sort_order: Number(image.sort_order) || 0,
              is_cover: Boolean(image.is_cover),
              show_in_gallery: image.show_in_gallery !== false,
              status: normalizeStatus(image.status),
            }) satisfies ProjectImage,
        ),
    );

    applyAdminState(
      rpcSection?.id
        ? {
            id: String(rpcSection.id),
            section_key: "projects",
            step: rpcSection.step || "03",
            title: rpcSection.title || "Projetos selecionados.",
            description: rpcSection.description || "",
            status: normalizeStatus(rpcSection.status),
          }
        : defaultSection,
      (content.brandItems || [])
        .filter((brand) => brand.id)
        .map(
          (brand) =>
            ({
              id: String(brand.id),
              name: brand.name || "",
              sort_order: Number(brand.sort_order) || 0,
              status: normalizeStatus(brand.status),
            }) satisfies BrandItem,
        ),
      projectData,
      imageData,
      (content.siteAssets || [])
        .filter((asset) => asset.id)
        .map(
          (asset) =>
            ({
              id: String(asset.id),
              asset_key: asset.asset_key || "",
              label: asset.label || asset.asset_key || "Midia",
              storage_path: asset.storage_path || "",
              public_url: asset.public_url || "",
              alt_text: asset.alt_text || "",
              status: normalizeStatus(asset.status),
            }) satisfies SiteAsset,
        ),
    );

    return true;
  }

  async function loadAdminData() {
    const client = supabase;
    if (!client) return;

    const [sectionResult, brandResult, projectResult, imageResult, assetResult] = await Promise.all([
      client.from("site_sections").select("*").eq("section_key", "projects").maybeSingle(),
      client.from("brand_items").select("*").order("sort_order"),
      client.from("projects").select("*").order("sort_order"),
      client.from("project_images").select("*").order("sort_order"),
      client.from("site_assets").select("*").order("asset_key"),
    ]);

    const firstError =
      sectionResult.error || brandResult.error || projectResult.error || imageResult.error || assetResult.error;
    if (firstError) {
      const loadedFromRpc = await loadAdminDataFromRpc();
      if (loadedFromRpc) return;
      throw firstError;
    }

    const sectionData = sectionResult.data as AdminSection | null;
    const projectData = (projectResult.data || []) as AdminProject[];
    const brandData = (brandResult.data || []) as BrandItem[];
    const imageData = (imageResult.data || []) as ProjectImage[];
    const assetData = (assetResult.data || []) as SiteAsset[];

    if (!sectionData && brandData.length === 0 && projectData.length === 0 && imageData.length === 0 && assetData.length === 0) {
      const loadedFromRpc = await loadAdminDataFromRpc();
      if (loadedFromRpc) return;
    }

    applyAdminState(sectionData, brandData, projectData, imageData, assetData);
  }

  async function runAction(action: () => Promise<void>, successMessage: string, loadingLabel = "Processando...") {
    setIsBusy(true);
    setBusyLabel(loadingLabel);
    setError("");
    setMessage("");

    try {
      await action();
      setMessage(successMessage);
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    } finally {
      setIsBusy(false);
      setBusyLabel("");
    }
  }

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setAuthReady(true);
      return;
    }

    let isMounted = true;

    client.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;

      try {
        if (data.session && (await verifyAdmin())) {
          setSession(data.session);
          setIsLoadingData(true);
          await loadAdminData();
        } else if (data.session) {
          await client.auth.signOut();
        }
      } catch (initialError) {
        setError(getErrorMessage(initialError));
      } finally {
        setIsLoadingData(false);
        setAuthReady(true);
      }
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = supabase;
    if (!client) return;

    await runAction(async () => {
      const { data, error: loginError } = await client.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password,
      });
      if (loginError) throw loginError;
      if (!data.session) throw new Error("Sessao nao iniciada.");

      await client.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      const isAdmin = await verifyAdmin();
      if (!isAdmin) {
        await client.auth.signOut();
        throw new Error("Este usuario nao esta autorizado como admin.");
      }

      setSession(data.session);
      setPassword("");
      setIsLoadingData(true);
      await loadAdminData();
      setIsLoadingData(false);
    }, "Acesso liberado.", "Entrando...");
  }

  async function handleLogout() {
    const client = supabase;
    if (!client) return;

    await client.auth.signOut();
    setSession(null);
  }

  async function saveSection() {
    const client = supabase;
    if (!client) return;

    await runAction(async () => {
      const { error: saveError } = await client.rpc("admin_save_project_section", {
        p_step: section.step.trim() || "03",
        p_title: section.title.trim() || "Projetos selecionados.",
        p_description: section.description?.trim() || null,
        p_status: section.status,
      });
      if (saveError) throw saveError;
      await loadAdminData();
    }, "Secao salva.", "Salvando secao...");
  }

  function updateBrand(id: string, patch: Partial<BrandItem>) {
    setBrands((current) => current.map((brand) => (brand.id === id ? { ...brand, ...patch } : brand)));
  }

  async function saveBrands() {
    const client = supabase;
    if (!client) return;

    await runAction(async () => {
      const payload = brands
        .filter((brand) => brand.name.trim())
        .map((brand) => ({
          ...(brand.id.startsWith("local-") ? {} : { id: brand.id }),
          name: brand.name.trim(),
          sort_order: Number(brand.sort_order) || 0,
          status: brand.status,
        }));

      const { error: saveError } = await client.rpc("admin_save_brands", { p_items: payload });
      if (saveError) throw saveError;
      await loadAdminData();
    }, "Marcas salvas.", "Salvando marcas...");
  }

  async function deleteBrand(brand: BrandItem) {
    const client = supabase;
    if (!client) return;

    if (brand.id.startsWith("local-")) {
      setBrands((current) => current.filter((item) => item.id !== brand.id));
      return;
    }

    await runAction(async () => {
      const { error: deleteError } = await client.rpc("admin_delete_brand", { p_id: brand.id });
      if (deleteError) throw deleteError;
      await loadAdminData();
    }, "Marca removida.", "Removendo marca...");
  }

  function startNewProject() {
    setProjectDraft(emptyProject((projects.length + 1) * 10));
    setTab("projects");
  }

  function selectProject(project: AdminProject) {
    setProjectDraft({ ...project, tags: [...project.tags] });
    setActiveProjectId(project.id);
    setTab("projects");
  }

  async function saveProject() {
    const client = supabase;
    if (!client) return;

    await runAction(async () => {
      const slug = projectDraft.slug.trim() || slugify(projectDraft.title);
      const payload = {
        id: projectDraft.id || "",
        slug,
        title: projectDraft.title.trim() || "Projeto sem titulo",
        type: projectDraft.type.trim(),
        summary: projectDraft.summary.trim(),
        description: projectDraft.description.trim(),
        url: projectDraft.url.trim() || null,
        tags: projectDraft.tags,
        sort_order: Number(projectDraft.sort_order) || 0,
        is_published: projectDraft.is_published,
        is_hero_featured: projectDraft.is_hero_featured,
      };

      const { data, error: saveError } = await client.rpc("admin_save_project", { p_project: payload });
      if (saveError) throw saveError;
      if (typeof data === "string") setActiveProjectId(data);

      await loadAdminData();
    }, "Projeto salvo.", "Salvando projeto...");
  }

  async function deleteProject() {
    const client = supabase;
    if (!client || !projectDraft.id) return;
    if (!window.confirm("Remover este projeto e suas imagens do banco?")) return;

    await runAction(async () => {
      const relatedImages = images.filter((image) => image.project_id === projectDraft.id && image.storage_path);
      if (relatedImages.length > 0) {
        await client.storage.from(STORAGE_BUCKET).remove(relatedImages.map((image) => image.storage_path));
      }

      const { error: deleteError } = await client.rpc("admin_delete_project", { p_id: projectDraft.id });
      if (deleteError) throw deleteError;
      setProjectDraft(emptyProject(10));
      await loadAdminData();
    }, "Projeto removido.", "Removendo projeto...");
  }

  async function saveProjectPatch(project: AdminProject, patch: Partial<AdminProject>, successMessage: string, loadingLabel: string) {
    const client = supabase;
    if (!client) return;

    await runAction(async () => {
      const { error: saveError } = await client.rpc("admin_save_project", {
        p_project: {
          ...project,
          ...patch,
        },
      });
      if (saveError) throw saveError;
      await loadAdminData();
    }, successMessage, loadingLabel);
  }

  async function toggleHeroProject(project: AdminProject) {
    await saveProjectPatch(
      project,
      { is_hero_featured: !project.is_hero_featured },
      project.is_hero_featured ? "Projeto removido do hero." : "Destaque do hero atualizado.",
      "Atualizando hero...",
    );
  }

  async function toggleProjectPublished(project: AdminProject) {
    await saveProjectPatch(
      project,
      { is_published: !project.is_published },
      project.is_published ? "Projeto ocultado da secao." : "Projeto exibido na secao.",
      "Atualizando exibicao...",
    );
  }

  async function uploadProjectFiles(event: ChangeEvent<HTMLInputElement>) {
    const client = supabase;
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!client || !activeProject || files.length === 0) return;

    await runAction(async () => {
      const projectSlug = slugify(activeProject.slug || activeProject.title);
      let nextOrder = projectImages.reduce((max, image) => Math.max(max, image.sort_order), 0) + 10;

      for (const file of files) {
        const storagePath = `projects/${projectSlug}/${sanitizeFileName(file.name)}`;
        const uploadResult = await client.storage.from(STORAGE_BUCKET).upload(storagePath, file, {
          cacheControl: "31536000",
          contentType: file.type || undefined,
          upsert: false,
        });
        if (uploadResult.error) throw uploadResult.error;

        const publicUrl = client.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath).data.publicUrl;
        const { error: insertError } = await client.rpc("admin_save_project_image", {
          p_image: {
            project_id: activeProject.id,
            storage_path: storagePath,
            public_url: publicUrl,
            alt_text: `${activeProject.title} - imagem`,
            sort_order: nextOrder,
            is_cover: projectImages.length === 0 && nextOrder === 10,
            show_in_gallery: true,
            status: "active",
          },
        });
        if (insertError) throw insertError;
        nextOrder += 10;
      }

      await loadAdminData();
    }, files.length > 1 ? "Imagens enviadas." : "Imagem enviada.", "Enviando imagens...");
  }

  function updateImage(id: string, patch: Partial<ProjectImage>) {
    setImages((current) => current.map((image) => (image.id === id ? { ...image, ...patch } : image)));
  }

  async function saveImage(image: ProjectImage) {
    const client = supabase;
    if (!client) return;

    await runAction(async () => {
      const { error: updateError } = await client.rpc("admin_save_project_image", {
        p_image: {
          id: image.id,
          alt_text: image.alt_text.trim(),
          sort_order: Number(image.sort_order) || 0,
          show_in_gallery: image.show_in_gallery,
          status: image.status,
        },
      });
      if (updateError) throw updateError;
      await loadAdminData();
    }, "Imagem salva.", "Salvando imagem...");
  }

  async function setCoverImage(image: ProjectImage) {
    const client = supabase;
    if (!client) return;

    await runAction(async () => {
      const coverResult = await client.rpc("admin_set_cover_image", { p_image_id: image.id });
      if (coverResult.error) throw coverResult.error;
      await loadAdminData();
    }, "Capa definida.", "Definindo capa...");
  }

  async function deleteImage(image: ProjectImage) {
    const client = supabase;
    if (!client) return;
    if (!window.confirm("Remover esta imagem?")) return;

    await runAction(async () => {
      const { error: deleteError } = await client.rpc("admin_delete_project_image", { p_id: image.id });
      if (deleteError) throw deleteError;
      if (image.storage_path) {
        await client.storage.from(STORAGE_BUCKET).remove([image.storage_path]);
      }
      await loadAdminData();
    }, "Imagem removida.", "Removendo imagem...");
  }

  async function uploadSiteAsset(event: ChangeEvent<HTMLInputElement>, key: string, label: string) {
    const client = supabase;
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!client || !file) return;

    await runAction(async () => {
      const storagePath = `site/${slugify(key)}/${sanitizeFileName(file.name)}`;
      const uploadResult = await client.storage.from(STORAGE_BUCKET).upload(storagePath, file, {
        cacheControl: "31536000",
        contentType: file.type || undefined,
        upsert: false,
      });
      if (uploadResult.error) throw uploadResult.error;

      const existing = assets.find((asset) => asset.asset_key === key);
      const publicUrl = client.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath).data.publicUrl;
      const { error: upsertError } = await client.rpc("admin_save_site_asset", {
        p_asset: {
          asset_key: key,
          label,
          storage_path: storagePath,
          public_url: publicUrl,
          alt_text: label,
          status: "active",
        },
      });
      if (upsertError) throw upsertError;
      if (existing?.storage_path) {
        await client.storage.from(STORAGE_BUCKET).remove([existing.storage_path]);
      }
      await loadAdminData();
    }, "Midia enviada.", "Enviando midia...");
  }

  async function deleteAsset(asset: SiteAsset) {
    const client = supabase;
    if (!client) return;
    if (!window.confirm("Remover esta midia global?")) return;

    await runAction(async () => {
      const { error: deleteError } = await client.rpc("admin_delete_site_asset", { p_id: asset.id });
      if (deleteError) throw deleteError;
      if (asset.storage_path) {
        await client.storage.from(STORAGE_BUCKET).remove([asset.storage_path]);
      }
      await loadAdminData();
    }, "Midia removida.", "Removendo midia...");
  }

  if (!hasSupabaseConfig) {
    return (
      <main className="admin-login">
        <section className="admin-login__panel">
          <h1>Admin indisponivel</h1>
          <p>Configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `VITE_ADMIN_EMAIL` para ativar esta area.</p>
        </section>
      </main>
    );
  }

  if (!authReady) {
    return (
      <main className="admin-login">
        <section className="admin-login__panel">
          <LoadingIndicator label="Carregando admin..." />
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="admin-login">
        <form className="admin-login__panel" onSubmit={handleLogin}>
          <p className="admin-kicker">Portfolio Moises Gomes</p>
          <h1>Area admin</h1>
          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error ? <p className="admin-status admin-status--error">{error}</p> : null}
          <button type="submit" disabled={isBusy}>
            {isBusy ? (
              <>
                <span className="admin-spinner admin-spinner--light" aria-hidden="true" /> Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="admin-kicker">Portfolio Moises Gomes</p>
          <h1>Area admin</h1>
        </div>
        <button className="admin-button admin-button--ghost" type="button" onClick={handleLogout}>
          <LogOut size={17} aria-hidden="true" /> Sair
        </button>
      </header>

      <nav className="admin-tabs" aria-label="Areas do admin">
        <button type="button" className={tab === "section" ? "active" : ""} onClick={() => setTab("section")}>
          <Settings size={17} aria-hidden="true" /> Secao Projetos
        </button>
        <button type="button" className={tab === "projects" ? "active" : ""} onClick={() => setTab("projects")}>
          <FolderKanban size={17} aria-hidden="true" /> Projetos
        </button>
        <button type="button" className={tab === "images" ? "active" : ""} onClick={() => setTab("images")}>
          <ImageIcon size={17} aria-hidden="true" /> Imagens
        </button>
        <button type="button" className={tab === "assets" ? "active" : ""} onClick={() => setTab("assets")}>
          <Upload size={17} aria-hidden="true" /> Midias
        </button>
      </nav>

      {message ? <p className="admin-status admin-status--success">{message}</p> : null}
      {error ? <p className="admin-status admin-status--error">{error}</p> : null}
      {isLoadingData ? <LoadingIndicator label="Carregando informacoes..." /> : null}
      {isBusy && busyLabel ? <LoadingIndicator label={busyLabel} /> : null}

      <div className={isLoadingData ? "admin-content admin-content--loading" : "admin-content"}>
      {isLoadingData ? (
        <div className="admin-content__overlay">
          <LoadingIndicator label="Atualizando dados..." />
        </div>
      ) : null}

      {tab === "section" ? (
        <section className="admin-grid">
          <article className="admin-panel">
            <h2>Texto da secao</h2>
            <label>
              Step
              <input value={section.step} onChange={(event) => setSection({ ...section, step: event.target.value })} />
            </label>
            <label>
              Titulo
              <input value={section.title} onChange={(event) => setSection({ ...section, title: event.target.value })} />
            </label>
            <label>
              Texto auxiliar
              <textarea
                rows={4}
                value={section.description || ""}
                onChange={(event) => setSection({ ...section, description: event.target.value })}
              />
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={section.status === "active"}
                onChange={(event) => setSection({ ...section, status: event.target.checked ? "active" : "hidden" })}
              />
              Secao ativa
            </label>
            <button className="admin-button" type="button" onClick={saveSection} disabled={isBusy}>
              {isBusy ? <span className="admin-spinner admin-spinner--light" aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}
              {isBusy ? "Salvando..." : "Salvar secao"}
            </button>
          </article>

          <article className="admin-panel">
            <div className="admin-panel__title">
              <h2>Marcas</h2>
              <button
                className="admin-button admin-button--ghost"
                type="button"
                onClick={() => setBrands((current) => [...current, { id: localId(), name: "", sort_order: (current.length + 1) * 10, status: "active" }])}
              >
                <Plus size={16} aria-hidden="true" /> Marca
              </button>
            </div>
            <div className="admin-list">
              {brands.map((brand) => (
                <div className="admin-row" key={brand.id}>
                  <input value={brand.name} onChange={(event) => updateBrand(brand.id, { name: event.target.value })} />
                  <input
                    type="number"
                    value={brand.sort_order}
                    onChange={(event) => updateBrand(brand.id, { sort_order: Number(event.target.value) })}
                    aria-label="Ordem"
                  />
                  <label className="admin-check">
                    <input
                      type="checkbox"
                      checked={brand.status === "active"}
                      onChange={(event) => updateBrand(brand.id, { status: event.target.checked ? "active" : "hidden" })}
                    />
                    Ativa
                  </label>
                  <button className="admin-icon-button" type="button" onClick={() => deleteBrand(brand)} aria-label="Remover marca">
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            <button className="admin-button" type="button" onClick={saveBrands} disabled={isBusy}>
              {isBusy ? <span className="admin-spinner admin-spinner--light" aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}
              {isBusy ? "Salvando..." : "Salvar marcas"}
            </button>
          </article>
        </section>
      ) : null}

      {tab === "projects" ? (
        <section className="admin-grid admin-grid--wide">
          <aside className="admin-panel admin-project-list">
            <div className="admin-panel__title">
              <h2>Projetos</h2>
              <button className="admin-button admin-button--ghost" type="button" onClick={startNewProject}>
                <Plus size={16} aria-hidden="true" /> Novo
              </button>
            </div>
            {projects.map((project) => (
              <div className={projectDraft.id === project.id ? "admin-project-chip active" : "admin-project-chip"} key={project.id}>
                <button className="admin-project-chip__main" type="button" onClick={() => selectProject(project)}>
                  <span>{project.title}</span>
                  <small>{project.is_published ? "Publicado" : "Rascunho"}</small>
                </button>
                <div className="admin-project-chip__actions">
                  <label className="admin-project-toggle">
                    <input
                      type="checkbox"
                      checked={project.is_published}
                      onChange={() => toggleProjectPublished(project)}
                      disabled={isBusy}
                    />
                    Exibir
                  </label>
                  <button
                    className={project.is_hero_featured ? "admin-mini-button admin-mini-button--hero" : "admin-mini-button"}
                    type="button"
                    onClick={() => toggleHeroProject(project)}
                    disabled={isBusy}
                    title={project.is_hero_featured ? "Clique para remover do hero" : "Clique para definir como hero"}
                    aria-label={project.is_hero_featured ? `Remover ${project.title} do hero` : `Definir ${project.title} como hero`}
                  >
                    {project.is_hero_featured ? "Hero atual" : "Definir hero"}
                  </button>
                </div>
              </div>
            ))}
          </aside>

          <article className="admin-panel">
            <h2>{projectDraft.id ? "Editar projeto" : "Novo projeto"}</h2>
            <div className="admin-form-grid">
              <label>
                Titulo
                <input value={projectDraft.title} onChange={(event) => setProjectDraft({ ...projectDraft, title: event.target.value })} />
              </label>
              <label>
                Slug
                <input value={projectDraft.slug} placeholder="gerado pelo titulo" onChange={(event) => setProjectDraft({ ...projectDraft, slug: event.target.value })} />
              </label>
              <label>
                Tipo
                <input value={projectDraft.type} onChange={(event) => setProjectDraft({ ...projectDraft, type: event.target.value })} />
              </label>
              <label>
                URL
                <input value={projectDraft.url} onChange={(event) => setProjectDraft({ ...projectDraft, url: event.target.value })} />
              </label>
              <label>
                Ordem
                <input
                  type="number"
                  value={projectDraft.sort_order}
                  onChange={(event) => setProjectDraft({ ...projectDraft, sort_order: Number(event.target.value) })}
                />
              </label>
              <label>
                Tags
                <input
                  value={projectDraft.tags.join(", ")}
                  onChange={(event) => setProjectDraft({ ...projectDraft, tags: parseTags(event.target.value) })}
                />
              </label>
            </div>
            <label>
              Resumo
              <textarea
                rows={3}
                value={projectDraft.summary}
                onChange={(event) => setProjectDraft({ ...projectDraft, summary: event.target.value })}
              />
            </label>
            <label>
              Descricao
              <textarea
                rows={6}
                value={projectDraft.description}
                onChange={(event) => setProjectDraft({ ...projectDraft, description: event.target.value })}
              />
            </label>
            <div className="admin-inline-options">
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={projectDraft.is_published}
                  onChange={(event) => setProjectDraft({ ...projectDraft, is_published: event.target.checked })}
                />
                Publicado
              </label>
            </div>
            <div className="admin-actions">
              <button className="admin-button" type="button" onClick={saveProject} disabled={isBusy}>
                {isBusy ? <span className="admin-spinner admin-spinner--light" aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}
                {isBusy ? "Salvando..." : "Salvar projeto"}
              </button>
              {projectDraft.id ? (
                <button className="admin-button admin-button--danger" type="button" onClick={deleteProject} disabled={isBusy}>
                  {isBusy ? <span className="admin-spinner admin-spinner--light" aria-hidden="true" /> : <Trash2 size={17} aria-hidden="true" />}
                  {isBusy ? "Removendo..." : "Remover"}
                </button>
              ) : null}
            </div>
          </article>
        </section>
      ) : null}

      {tab === "images" ? (
        <section className="admin-panel">
          <div className="admin-panel__title">
            <div>
              <h2>Imagens dos projetos</h2>
              {activeProject ? <p>{activeProject.title}</p> : null}
            </div>
            <select value={activeProject?.id || ""} onChange={(event) => setActiveProjectId(event.target.value)}>
              {projects.map((project) => (
                <option value={project.id} key={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>
          {activeProject ? (
            <label className="admin-upload">
              <Upload size={18} aria-hidden="true" />
              {isBusy ? "Enviando..." : "Enviar imagens"}
              <input type="file" accept="image/avif,image/webp,image/jpeg,image/png" multiple onChange={uploadProjectFiles} disabled={isBusy} />
            </label>
          ) : (
            <p>Nenhum projeto cadastrado.</p>
          )}
          <div className="admin-media-grid">
            {projectImages.map((image) => (
              <article className="admin-media-card" key={image.id}>
                <img src={image.public_url} alt={image.alt_text || "Imagem do projeto"} />
                <label>
                  Alt text
                  <input value={image.alt_text} onChange={(event) => updateImage(image.id, { alt_text: event.target.value })} />
                </label>
                <label>
                  Ordem
                  <input
                    type="number"
                    value={image.sort_order}
                    onChange={(event) => updateImage(image.id, { sort_order: Number(event.target.value) })}
                  />
                </label>
                <div className="admin-inline-options">
                  <label className="admin-check">
                    <input
                      type="checkbox"
                      checked={image.show_in_gallery}
                      onChange={(event) => updateImage(image.id, { show_in_gallery: event.target.checked })}
                    />
                    Galeria
                  </label>
                  <label className="admin-check">
                    <input
                      type="checkbox"
                      checked={image.status === "active"}
                      onChange={(event) => updateImage(image.id, { status: event.target.checked ? "active" : "hidden" })}
                    />
                    Ativa
                  </label>
                </div>
                <div className="admin-actions">
                  <button className="admin-button admin-button--ghost" type="button" onClick={() => setCoverImage(image)}>
                    {image.is_cover ? "Capa atual" : "Definir capa"}
                  </button>
                  <button className="admin-icon-button" type="button" onClick={() => saveImage(image)} aria-label="Salvar imagem">
                    <Save size={17} aria-hidden="true" />
                  </button>
                  <button className="admin-icon-button admin-icon-button--danger" type="button" onClick={() => deleteImage(image)} aria-label="Remover imagem">
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "assets" ? (
        <section className="admin-grid">
          <article className="admin-panel">
            <h2>Midias globais</h2>
            {knownAssets.map((asset) => (
              <label className="admin-upload admin-upload--line" key={asset.key}>
                <Upload size={18} aria-hidden="true" />
                Trocar {asset.label}
                  <input
                  type="file"
                  accept={asset.key === "resume_file" ? "application/pdf" : "image/avif,image/webp,image/jpeg,image/png"}
                  onChange={(event) => uploadSiteAsset(event, asset.key, asset.label)}
                  disabled={isBusy}
                />
              </label>
            ))}
            <div className="admin-form-grid">
              <label>
                Chave customizada
                <input value={customAssetKey} onChange={(event) => setCustomAssetKey(event.target.value)} />
              </label>
              <label>
                Rotulo
                <input value={customAssetLabel} onChange={(event) => setCustomAssetLabel(event.target.value)} />
              </label>
            </div>
            <label className="admin-upload admin-upload--line">
              <Upload size={18} aria-hidden="true" />
              {isBusy ? "Enviando..." : "Enviar midia customizada"}
              <input
                type="file"
                accept="image/avif,image/webp,image/jpeg,image/png,application/pdf"
                onChange={(event) => uploadSiteAsset(event, customAssetKey.trim(), customAssetLabel.trim() || customAssetKey.trim())}
                disabled={!customAssetKey.trim() || isBusy}
              />
            </label>
          </article>

          <article className="admin-panel">
            <h2>Arquivos cadastrados</h2>
            <div className="admin-asset-list">
              {assets.map((asset) => (
                <div className="admin-asset" key={asset.id}>
                  {isImageUrl(asset.public_url) ? <img src={asset.public_url} alt={asset.alt_text || asset.label} /> : <span>PDF</span>}
                  <div>
                    <strong>{asset.label}</strong>
                    <small>{asset.asset_key}</small>
                  </div>
                  <a href={asset.public_url} target="_blank" rel="noreferrer">
                    Abrir
                  </a>
                  <button className="admin-icon-button admin-icon-button--danger" type="button" onClick={() => deleteAsset(asset)} aria-label="Remover midia">
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}
      </div>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("admin-root")!).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>,
);
