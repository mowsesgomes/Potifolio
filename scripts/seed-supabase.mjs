import { mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { build } from "esbuild";

const STORAGE_BUCKET = "portfolio-media";
const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const tmpRoot = await mkdir(path.join(tmpdir(), `portfolio-seed-${Date.now()}`), { recursive: true });
const compiledPortfolio = path.join(tmpRoot, "portfolio.mjs");

async function loadDotEnv() {
  try {
    const envFile = await readFile(path.join(repoRoot, ".env"), "utf8");
    for (const rawLine of envFile.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#") || !line.includes("=")) continue;

      const separatorIndex = line.indexOf("=");
      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] ||= value;
    }
  } catch {
    // The script can still run with environment variables provided by the shell.
  }
}

await loadDotEnv();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de rodar o seed.");
}

if (!/^(sb_secret_|eyJ)/.test(serviceRoleKey)) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY invalida. Use uma Secret key que comece com sb_secret_ ou a service_role legacy que comece com eyJ. Nao use a Publishable key aqui.",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

function slugify(value) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "item"
  );
}

function mimeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".avif") return "image/avif";
  if (extension === ".webp") return "image/webp";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".pdf") return "application/pdf";
  return "application/octet-stream";
}

function sanitizeStoragePath(relativePath) {
  return relativePath
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      const extension = path.extname(segment).toLowerCase();
      const basename = extension ? segment.slice(0, -extension.length) : segment;
      return `${slugify(basename)}${extension}`;
    })
    .join("/");
}

function assertNoError(result, label) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
  return result;
}

async function ensureStorageBucket() {
  const options = {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/avif", "image/webp", "image/jpeg", "image/png", "application/pdf"],
  };

  const createResult = await supabase.storage.createBucket(STORAGE_BUCKET, options);
  if (!createResult.error) return;

  const alreadyExists =
    createResult.error.message?.toLowerCase().includes("already exists") ||
    createResult.error.message?.toLowerCase().includes("duplicate");

  if (!alreadyExists) {
    throw new Error(`bucket ${STORAGE_BUCKET}: ${createResult.error.message}`);
  }

  assertNoError(await supabase.storage.updateBucket(STORAGE_BUCKET, options), `update bucket ${STORAGE_BUCKET}`);
}

async function loadPortfolio() {
  await build({
    entryPoints: [path.join(repoRoot, "src/data/portfolio.ts")],
    outfile: compiledPortfolio,
    bundle: true,
    format: "esm",
    platform: "node",
    logLevel: "silent",
  });

  const module = await import(pathToFileURL(compiledPortfolio).href);
  return module.portfolio;
}

async function uploadPublicAsset(publicPath, storagePrefix) {
  if (!publicPath?.startsWith("/assets/")) {
    return { publicUrl: publicPath, storagePath: publicPath };
  }

  const diskPath = path.join(repoRoot, "public", publicPath.replace(/^\//, ""));
  const bytes = await readFile(diskPath);
  const relative = publicPath.replace(/^\/assets\//, "").replaceAll("\\", "/");
  const storagePath = `${storagePrefix}/${sanitizeStoragePath(relative)}`;
  const body = new Blob([bytes], { type: mimeFor(diskPath) });

  assertNoError(
    await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, body, {
      cacheControl: "31536000",
      contentType: mimeFor(diskPath),
      upsert: true,
    }),
    `upload ${publicPath}`,
  );

  return {
    publicUrl: supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath).data.publicUrl,
    storagePath,
  };
}

async function seed() {
  const portfolio = await loadPortfolio();
  await ensureStorageBucket();

  assertNoError(
    await supabase.from("site_sections").upsert(
      {
        section_key: "projects",
        step: portfolio.projectSection.step,
        title: portfolio.projectSection.title,
        description: portfolio.projectSection.description || null,
        status: portfolio.projectSection.status,
      },
      { onConflict: "section_key" },
    ),
    "site_sections",
  );

  await supabase.from("brand_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (portfolio.brands.length > 0) {
    assertNoError(
      await supabase.from("brand_items").insert(
        portfolio.brands.map((name, index) => ({
          name,
          sort_order: (index + 1) * 10,
          status: "active",
        })),
      ),
      "brand_items",
    );
  }

  for (const [index, project] of portfolio.projects.entries()) {
    const slug = slugify(project.title);
    const projectResult = assertNoError(
      await supabase
        .from("projects")
        .upsert(
          {
            slug,
            title: project.title,
            type: project.type,
            summary: project.summary,
            description: project.description,
            url: project.url || null,
            tags: project.tags,
            sort_order: (index + 1) * 10,
            is_published: true,
            is_hero_featured: Boolean(project.isHeroFeatured),
          },
          { onConflict: "slug" },
        )
        .select("id")
        .single(),
      `project ${project.title}`,
    );

    const projectId = projectResult.data.id;
    await supabase.from("project_images").delete().eq("project_id", projectId);

    const imageRows = [];
    for (const [imageIndex, image] of project.images.entries()) {
      const uploadedImage = await uploadPublicAsset(image, "seed");
      imageRows.push({
        project_id: projectId,
        storage_path: uploadedImage.storagePath,
        public_url: uploadedImage.publicUrl,
        alt_text: `${project.title} - imagem ${imageIndex + 1}`,
        sort_order: (imageIndex + 1) * 10,
        is_cover: imageIndex === 0,
        show_in_gallery: imageIndex < (project.title === "Gendai" ? 7 : 3),
        status: "active",
      });
    }

    if (imageRows.length > 0) {
      assertNoError(await supabase.from("project_images").insert(imageRows), `project_images ${project.title}`);
    }
  }

  const profileAvatar = await uploadPublicAsset(portfolio.person.avatar, "seed");
  const resumeFile = await uploadPublicAsset(portfolio.resume.file, "seed");

  assertNoError(
    await supabase.from("site_assets").upsert(
      [
        {
          asset_key: "profile_avatar",
          label: "Foto de perfil",
          storage_path: profileAvatar.storagePath,
          public_url: profileAvatar.publicUrl,
          alt_text: `Foto de perfil de ${portfolio.person.name}`,
          status: "active",
        },
        {
          asset_key: "resume_file",
          label: "Curriculo PDF",
          storage_path: resumeFile.storagePath,
          public_url: resumeFile.publicUrl,
          alt_text: portfolio.resume.title,
          status: "active",
        },
      ],
      { onConflict: "asset_key" },
    ),
    "site_assets",
  );

  console.log("Seed concluido com sucesso.");
}

try {
  await seed();
} finally {
  await rm(tmpRoot, { recursive: true, force: true });
}
