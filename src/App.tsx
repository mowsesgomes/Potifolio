import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Facebook,
  FileText,
  Instagram,
  Linkedin,
  Mail,
  Menu,
  Pin,
  Send,
  X,
  ZoomIn,
} from "lucide-react";
import { ProjectCarousel } from "./components/ProjectCarousel";
import { portfolio as fallbackPortfolio } from "./data/portfolio";
import { loadPortfolioContent, type PortfolioContent } from "./lib/portfolioData";

const navItems = [
  { label: "Início", href: "#inicio" },
  { label: "Perfil", href: "#perfil" },
  { label: "Projetos", href: "#projetos" },
  { label: "Processo", href: "#processo" },
  { label: "Contato", href: "#contato" },
];

const tourItems = [
  { step: "01", label: "Abertura", href: "#inicio" },
  { step: "02", label: "Perfil", href: "#perfil" },
  { step: "03", label: "Projetos", href: "#projetos" },
  { step: "04", label: "Galeria", href: "#galeria" },
  { step: "05", label: "Processo", href: "#processo" },
];

const socialIcons = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  pinterest: Pin,
};

function whatsappUrl(portfolio: PortfolioContent) {
  const message = "Ola, Moises! Vi seu portfolio e gostaria de conversar sobre um projeto.";
  return `https://wa.me/${portfolio.person.whatsappDigits}?text=${encodeURIComponent(message)}`;
}

const firstContactEmail = "danilodcp18@gmail.com";
const creatorEmail = "danilodcp18@gmail.com";
const creatorWhatsappUrl = "https://wa.me/5513996545233";

type LightboxState = {
  images: string[];
  index: number;
  title: string;
};

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.33 4.95L2.05 22l5.27-1.38a9.92 9.92 0 0 0 4.72 1.2h.01c5.46 0 9.91-4.45 9.91-9.91S17.51 2 12.04 2Zm0 18.13h-.01a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.13.82.84-3.05-.2-.31a8.2 8.2 0 0 1-1.26-4.35c0-4.55 3.7-8.25 8.26-8.25a8.25 8.25 0 0 1-.01 16.47Zm4.52-6.18c-.25-.13-1.47-.72-1.7-.8-.23-.08-.39-.12-.56.13-.16.25-.64.8-.79.96-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.48-1.38-1.73-.15-.25-.02-.38.11-.51.12-.11.25-.29.38-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.13-.56-1.35-.76-1.84-.2-.48-.4-.42-.56-.42h-.47c-.16 0-.43.06-.66.31-.23.25-.86.84-.86 2.05s.88 2.38 1 2.54c.12.17 1.73 2.65 4.2 3.71.59.25 1.05.4 1.41.51.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.11-.22-.17-.46-.29Z" />
    </svg>
  );
}

function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 26 }}
      whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function SectionIntro({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description?: string;
}) {
  return (
    <Reveal className="section-intro">
      <span className="section-step">{step}</span>
      <h2>{title}</h2>
      {description ? <p className="section-lede">{description}</p> : null}
    </Reveal>
  );
}

export default function App() {
  const [portfolioContent, setPortfolioContent] = useState(fallbackPortfolio);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactFormStatus, setContactFormStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [toastMessage, setToastMessage] = useState("");
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [isGalleryExpanded, setIsGalleryExpanded] = useState(false);
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const [activeSection, setActiveSection] = useState(tourItems[0].href);
  const { scrollYProgress } = useScroll();
  const progressScale = useSpring(scrollYProgress, { damping: 28, stiffness: 120 });
  const prefersReducedMotion = useReducedMotion();
  const portfolio = portfolioContent;
  const heroProject =
    portfolio.projects.find((project) => project.isHeroFeatured && project.images.length > 0) ||
    portfolio.projects.find((project) => project.images.length > 0) ||
    fallbackPortfolio.projects[0];
  const galleryImages = portfolio.projects.flatMap((project) =>
    (project.galleryImages?.length ? project.galleryImages : project.images.slice(0, project.title === "Gendai" ? 7 : 3)).map((image) => ({
      image,
      title: project.title,
    })),
  );

  useEffect(() => {
    let isMounted = true;

    loadPortfolioContent().then((result) => {
      if (!isMounted) return;
      setPortfolioContent(result.portfolio);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!window.location.hash) return;
    const element = document.querySelector(window.location.hash);
    window.requestAnimationFrame(() => element?.scrollIntoView({ block: "start" }));
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || heroProject.images.length <= 1) return;

    const intervalId = window.setInterval(() => {
      setHeroImageIndex((current) => (current + 1) % heroProject.images.length);
    }, 4800);

    return () => window.clearInterval(intervalId);
  }, [heroProject.images.length, prefersReducedMotion]);

  useEffect(() => {
    if (!isContactModalOpen && !lightbox) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsContactModalOpen(false);
      if (event.key === "Escape") setLightbox(null);
      if (event.key === "ArrowLeft") {
        setLightbox((current) =>
          current ? { ...current, index: (current.index - 1 + current.images.length) % current.images.length } : current,
        );
      }
      if (event.key === "ArrowRight") {
        setLightbox((current) =>
          current ? { ...current, index: (current.index + 1) % current.images.length } : current,
        );
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isContactModalOpen, lightbox]);

  useEffect(() => {
    if (!toastMessage) return;

    const timeoutId = window.setTimeout(() => setToastMessage(""), 4200);
    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  useEffect(() => {
    const sections = tourItems
      .map((item) => document.querySelector<HTMLElement>(item.href))
      .filter((section): section is HTMLElement => Boolean(section));

    if (!sections.length) return;

    let frameId = 0;

    const updateActiveSection = () => {
      const readingLine = window.innerHeight * 0.38;
      const active = sections.reduce((current, section) => {
        const sectionTop = section.getBoundingClientRect().top;
        return sectionTop <= readingLine ? section : current;
      }, sections[0]);

      setActiveSection(`#${active.id}`);
    };

    const requestUpdate = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  async function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    setContactFormStatus("sending");
    const formData = new FormData(form);
    const getField = (name: string) => String(formData.get(name) ?? "").trim();
    const subject = `Primeiro contato - ${getField("name") || portfolio.person.name}`;
    const body = [
      "Novo primeiro contato pelo portfolio.",
      "",
      `Nome: ${getField("name")}`,
      `E-mail: ${getField("email")}`,
      `Telefone/WhatsApp: ${getField("phone") || "Nao informado"}`,
      `Tipo de projeto: ${getField("projectType") || "Nao informado"}`,
      "",
      "Mensagem:",
      getField("message"),
    ].join("\n");

    formData.append("_subject", subject);
    formData.append("_template", "table");
    formData.append("_captcha", "false");
    formData.append("body", body);

    try {
      const response = await fetch(`https://formsubmit.co/ajax/${firstContactEmail}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: formData,
      });
      const responseText = await response.text();
      const result = (() => {
        try {
          return JSON.parse(responseText || "{}") as { success?: boolean | string; message?: string };
        } catch {
          return {} as { success?: boolean | string; message?: string };
        }
      })();
      const successValue = String(result.success ?? "").toLowerCase();
      const successMessage = String(result.message ?? responseText).toLowerCase();
      const wasSubmitted =
        response.ok && (successValue === "true" || successMessage.includes("submitted successfully"));

      if (!wasSubmitted) {
        throw new Error(result?.message || "Falha ao enviar formulario.");
      }

      form.reset();
      setContactFormStatus("idle");
      setIsContactModalOpen(false);
      window.setTimeout(() => {
        setToastMessage("Mensagem enviada com sucesso. Obrigado pelo contato!");
      }, 120);
    } catch {
      setContactFormStatus("error");
    }
  }

  return (
    <div className="site">
      <motion.div className="scroll-progress" style={{ scaleX: progressScale }} />

      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Moises Gomes - início">
          <span>MG</span>
          <strong>{portfolio.person.name}</strong>
        </a>
        <nav className={isMenuOpen ? "nav nav--open" : "nav"} aria-label="Navegação principal">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setIsMenuOpen(false)}>
              {item.label}
            </a>
          ))}
        </nav>
        <button
          className="menu-button"
          type="button"
          aria-label="Menu"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <Menu size={20} aria-hidden="true" />
        </button>
      </header>

      <div className="floating-contact">
        <a className="floating-contact__option" href={whatsappUrl(portfolio)} target="_blank" rel="noreferrer">
          <WhatsAppIcon size={18} />
          WhatsApp
        </a>
        <button
          className="floating-contact__option"
          type="button"
          onClick={() => {
            setContactFormStatus("idle");
            setIsContactModalOpen(true);
          }}
        >
          <Mail size={18} aria-hidden="true" />
          E-mail
        </button>
        <button className="floating-contact__trigger" type="button" aria-label="Abrir opções de contato">
          <WhatsAppIcon size={24} />
        </button>
      </div>

      <aside className="tour-rail" aria-label="Trilha de leitura">
        {tourItems.map((item) => (
          <a
            className={activeSection === item.href ? "tour-rail__item tour-rail__item--active" : "tour-rail__item"}
            href={item.href}
            key={item.href}
            aria-current={activeSection === item.href ? "step" : undefined}
          >
            <span>{item.step}</span>
            {item.label}
          </a>
        ))}
      </aside>

      <main>
        <section className="hero" id="inicio">
          <div className="hero__backgrounds" aria-hidden="true">
            {heroProject.images.map((image, index) => (
              <div
                className={index === heroImageIndex ? "hero__background hero__background--active" : "hero__background"}
                key={image}
                style={{ backgroundImage: `url(${image})` }}
              />
            ))}
          </div>
          <div className="hero__shade" />
          <Reveal className="hero__content">
            <p className="eyebrow">01 / {portfolio.hero.eyebrow}</p>
            <h1>{portfolio.person.name}</h1>
            <p className="role">{portfolio.person.role}</p>
            <p className="hero__intro">{portfolio.hero.intro}</p>
            <div className="hero__actions">
              <a className="button button--glass" href="#projetos">
                Ver trabalhos
              </a>
            </div>
          </Reveal>
        </section>

        <section className="profile section section--dark" id="perfil">
          <SectionIntro
            step="02"
            title="Design com propósito."
          />

          <div className="profile-grid">
            <Reveal className="profile-card profile-card--intro">
              <div className="profile-identity">
                <button
                  className="profile-photo-button"
                  type="button"
                  onClick={() => setLightbox({ images: [portfolio.person.avatar], index: 0, title: portfolio.person.name })}
                  aria-label={`Expandir foto de perfil de ${portfolio.person.name}`}
                >
                  <img src={portfolio.person.avatar} alt={`Foto de perfil de ${portfolio.person.name}`} />
                </button>
                <div>
                  <p className="panel-label">Resumo profissional</p>
                  <h3>{portfolio.person.name}</h3>
                  <p className="profile-role">{portfolio.person.role}</p>
                </div>
              </div>
              <div className="profile-copy">
                <p>
                  {portfolio.about.paragraphs[0]} {portfolio.about.paragraphs[1]}
                </p>
                <p>{portfolio.about.paragraphs[2]}</p>
              </div>
              <div className="profile-highlights" aria-label="Especialidades principais">
                <span>Design gráfico</span>
                <span>Mídia online</span>
                <span>Web design</span>
              </div>
            </Reveal>

            <div className="profile-details">
              <Reveal className="profile-card profile-panel">
                <p className="panel-label">Áreas de atuação</p>
                <ul className="service-list">
                  {portfolio.services.map((service) => (
                    <li key={service}>{service}</li>
                  ))}
                </ul>
              </Reveal>

              <Reveal className="profile-card profile-panel">
                <p className="panel-label">Formação</p>
                <div className="education-list">
                  {portfolio.education.map((item) => (
                    <article key={item.title}>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </article>
                  ))}
                </div>
              </Reveal>

              <Reveal className="profile-card resume-card">
                <FileText size={26} aria-hidden="true" />
                <div>
                  <h3>{portfolio.resume.title}</h3>
                  <p>{portfolio.resume.summary}</p>
                </div>
                <a className="button button--light" href={portfolio.resume.file} target="_blank" rel="noreferrer">
                  Abrir PDF <Download size={17} aria-hidden="true" />
                </a>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="projects section" id="projetos">
          <SectionIntro
            step={portfolio.projectSection.step}
            title={portfolio.projectSection.title}
            description={portfolio.projectSection.description}
          />

          <Reveal className="brand-band">
            <div className="brand-cloud">
              <div className="brand-cloud__track">
                {portfolio.brands.map((brand) => (
                  <span key={brand}>{brand}</span>
                ))}
                {portfolio.brands.map((brand) => (
                  <span key={`${brand}-loop`} aria-hidden="true">
                    {brand}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>

          <div className="project-stack">
            {portfolio.projects.map((project, index) => (
              <Reveal key={project.title}>
                <ProjectCarousel
                  project={project}
                  index={index}
                  onImageClick={(imageIndex) =>
                    setLightbox({ images: project.images, index: imageIndex, title: project.title })
                  }
                />
              </Reveal>
            ))}
          </div>
        </section>

        <section className="gallery section section--soft" id="galeria">
          <SectionIntro
            step="04"
            title="Peças visuais."
          />
          <div className={isGalleryExpanded ? "gallery-shell gallery-shell--expanded" : "gallery-shell"}>
            <div className="gallery-grid">
              {galleryImages.map((item, index) => (
                <Reveal className="gallery-item" key={`${item.image}-${index}`}>
                  <button
                    type="button"
                    onClick={() =>
                      setLightbox({
                        images: galleryImages.map((galleryItem) => galleryItem.image),
                        index,
                        title: "Galeria",
                      })
                    }
                    aria-label={`Expandir ${item.title} - peça ${index + 1}`}
                  >
                    <img src={item.image} alt={`${item.title} - peça ${index + 1}`} loading="lazy" />
                    <span>{item.title}</span>
                    <ZoomIn size={18} aria-hidden="true" />
                  </button>
                </Reveal>
              ))}
            </div>
            {!isGalleryExpanded ? (
              <div className="gallery-fade">
                <button className="button button--dark" type="button" onClick={() => setIsGalleryExpanded(true)}>
                  Expandir galeria <ZoomIn size={17} aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <section className="process section" id="processo">
          <SectionIntro
            step="05"
            title="Da ideia à entrega."
          />
          <div className="process-grid">
            {portfolio.process.map((step, index) => (
              <Reveal className="process-card" key={step.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </Reveal>
            ))}
          </div>

          <Reveal className="process-cta">
            <div>
              <p className="eyebrow">Próximo passo</p>
              <h3>Tem uma ideia em mente? Vamos transformar em direção visual.</h3>
            </div>
            <p>
              Envie uma referência, um briefing simples ou apenas conte o objetivo do projeto. A conversa inicial ajuda
              a definir caminho, formato e prioridade antes do primeiro layout.
            </p>
            <div className="process-cta__actions">
              <a className="button button--dark" href={whatsappUrl(portfolio)} target="_blank" rel="noreferrer">
                Chamar no WhatsApp <WhatsAppIcon size={17} />
              </a>
              <button
                className="text-link"
                type="button"
                onClick={() => {
                  setContactFormStatus("idle");
                  setIsContactModalOpen(true);
                }}
              >
                Enviar briefing por e-mail <Mail size={16} aria-hidden="true" />
              </button>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="site-footer" id="contato">
        <Reveal className="footer__layout">
          <div className="footer__content">
            <address>
              <span className="contact-line contact-line--emails">
                <span>
                  <small>E-mail principal</small>
                  <a href={`mailto:${portfolio.person.email}`}>{portfolio.person.email}</a>
                </span>
                <span>
                  <small>E-mail alternativo</small>
                  <a href={`mailto:${portfolio.person.secondaryEmail}`}>{portfolio.person.secondaryEmail}</a>
                </span>
              </span>
              <span className="contact-line">
                <small>Telefone</small>
                {portfolio.person.phone}
              </span>
            </address>
          </div>
          <div className="footer__actions">
            <div className="social-links" aria-label="Canais de contato e redes sociais">
              <a className="footer-icon-action" href={whatsappUrl(portfolio)} target="_blank" rel="noreferrer" aria-label="WhatsApp">
                <WhatsAppIcon size={18} />
              </a>
              <button
                className="footer-icon-action"
                type="button"
                aria-label="E-mail"
                onClick={() => {
                  setContactFormStatus("idle");
                  setIsContactModalOpen(true);
                }}
              >
                <Mail size={18} aria-hidden="true" />
              </button>
              {portfolio.socialLinks.map((social) => {
                const Icon = socialIcons[social.icon];
                return social.status === "active" ? (
                  <a key={social.label} href={social.url} target="_blank" rel="noreferrer" aria-label={social.label}>
                    <Icon size={18} aria-hidden="true" />
                  </a>
                ) : null;
              })}
            </div>
            <a className="button button--outline-light" href={portfolio.resume.file} target="_blank" rel="noreferrer">
              Currículo <Download size={17} aria-hidden="true" />
            </a>
          </div>
        </Reveal>
      </footer>

      <section className="creator-credit" aria-label="Credito de criacao do projeto">
        <span>Projeto criado por Danilo.</span>
        <a href={`mailto:${creatorEmail}`}>{creatorEmail}</a>
        <a href={creatorWhatsappUrl} target="_blank" rel="noreferrer">
          WhatsApp: (13) 99654-5233
        </a>
      </section>

      {isContactModalOpen ? (
        <div className="contact-modal" role="presentation">
          <button
            className="contact-modal__backdrop"
            type="button"
            aria-label="Fechar formulário"
            onClick={() => setIsContactModalOpen(false)}
          />
          <section className="contact-modal__panel" role="dialog" aria-modal="true" aria-labelledby="contact-modal-title">
            <button
              className="contact-modal__close"
              type="button"
              aria-label="Fechar formulário"
              onClick={() => setIsContactModalOpen(false)}
            >
              <X size={18} aria-hidden="true" />
            </button>
            <p className="eyebrow">Primeiro contato</p>
            <h2 id="contact-modal-title">Conte rapidamente o que você precisa.</h2>
            <form className="contact-form" onSubmit={handleContactSubmit}>
              <label>
                Nome
                <input name="name" type="text" autoComplete="name" required />
              </label>
              <label>
                E-mail
                <input name="email" type="email" autoComplete="email" required />
              </label>
              <label>
                Telefone ou WhatsApp
                <input name="phone" type="tel" autoComplete="tel" />
              </label>
              <label>
                Tipo de projeto
                <select name="projectType" defaultValue="">
                  <option value="" disabled>
                    Selecione uma opção
                  </option>
                  <option>Website</option>
                  <option>Landing page</option>
                  <option>Identidade visual</option>
                  <option>Peças para mídia digital</option>
                  <option>Outro projeto</option>
                </select>
              </label>
              <label className="contact-form__message">
                Mensagem
                <textarea
                  name="message"
                  rows={5}
                  placeholder="Descreva objetivo, prazo, referências ou o contexto inicial."
                  required
                />
              </label>
              {contactFormStatus === "error" ? (
                <p className="contact-form__status contact-form__status--error">
                  Não foi possível enviar agora. Tente novamente em instantes.
                </p>
              ) : null}
              <button className="button button--dark" type="submit" disabled={contactFormStatus === "sending"}>
                {contactFormStatus === "sending" ? "Enviando..." : "Enviar por e-mail"}{" "}
                <Send size={17} aria-hidden="true" />
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {lightbox ? (
        <div className="image-lightbox" role="presentation">
          <button
            className="image-lightbox__backdrop"
            type="button"
            aria-label="Fechar imagem expandida"
            onClick={() => setLightbox(null)}
          />
          <section className="image-lightbox__panel" role="dialog" aria-modal="true" aria-label={`${lightbox.title} em tela cheia`}>
            <div className="image-lightbox__topbar">
              <div>
                <p>{lightbox.title}</p>
                <span>
                  {lightbox.index + 1} / {lightbox.images.length}
                </span>
              </div>
              <button type="button" aria-label="Fechar imagem expandida" onClick={() => setLightbox(null)}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <button
              className="image-lightbox__nav image-lightbox__nav--prev"
              type="button"
              aria-label="Imagem anterior"
              onClick={() =>
                setLightbox((current) =>
                  current
                    ? { ...current, index: (current.index - 1 + current.images.length) % current.images.length }
                    : current,
                )
              }
            >
              <ArrowLeft size={22} aria-hidden="true" />
            </button>
            <img src={lightbox.images[lightbox.index]} alt={`${lightbox.title} - imagem ${lightbox.index + 1}`} />
            <button
              className="image-lightbox__nav image-lightbox__nav--next"
              type="button"
              aria-label="Próxima imagem"
              onClick={() =>
                setLightbox((current) =>
                  current ? { ...current, index: (current.index + 1) % current.images.length } : current,
                )
              }
            >
              <ArrowRight size={22} aria-hidden="true" />
            </button>
          </section>
        </div>
      ) : null}

      {toastMessage ? (
        <div className="toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      ) : null}
    </div>
  );
}
