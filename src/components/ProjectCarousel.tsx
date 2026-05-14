import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import type { Project } from "../data/portfolio";

type ProjectCarouselProps = {
  project: Project;
  index: number;
  onImageClick?: (imageIndex: number) => void;
};

export function ProjectCarousel({ project, index, onImageClick }: ProjectCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: project.images.length > 1 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const hasImages = project.images.length > 0;

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((slideIndex: number) => emblaApi?.scrollTo(slideIndex), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi]);

  return (
    <article className="project" id={`projeto-${index + 1}`}>
      <div className="project__content">
        <p className="eyebrow">{project.type}</p>
        <h3>{project.title}</h3>
        <p className="project__summary">{project.summary}</p>
        <p>{project.description}</p>
        <div className="tag-list" aria-label={`Categorias de ${project.title}`}>
          {project.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        {project.url ? (
          <a className="text-link" href={project.url} target="_blank" rel="noreferrer">
            Ver site <ExternalLink aria-hidden="true" size={16} />
          </a>
        ) : null}
      </div>

      <div className="project__carousel">
        <div className="embla" ref={emblaRef}>
          <div className="embla__container">
            {hasImages ? (
              project.images.map((image, imageIndex) => (
                <figure className="embla__slide" key={image}>
                  <button
                    className="image-open-button"
                    type="button"
                    onClick={() => onImageClick?.(imageIndex)}
                    aria-label={`Expandir imagem ${imageIndex + 1} de ${project.title}`}
                  >
                    <img src={image} alt={`${project.title} - imagem ${imageIndex + 1}`} loading="lazy" />
                  </button>
                </figure>
              ))
            ) : (
              <figure className="embla__slide embla__slide--empty">
                <span>Imagem em breve</span>
              </figure>
            )}
          </div>
        </div>

        {project.images.length > 1 ? (
          <div className="carousel-controls" aria-label={`Controles do carrossel ${project.title}`}>
          <button type="button" onClick={scrollPrev} aria-label="Imagem anterior">
            <ArrowLeft aria-hidden="true" size={18} />
          </button>
          <div className="dots">
            {project.images.map((image, dotIndex) => (
              <button
                type="button"
                key={`${image}-dot`}
                className={dotIndex === selectedIndex ? "dot dot--active" : "dot"}
                onClick={() => scrollTo(dotIndex)}
                aria-label={`Ir para imagem ${dotIndex + 1}`}
                aria-current={dotIndex === selectedIndex ? "true" : undefined}
              />
            ))}
          </div>
          <button type="button" onClick={scrollNext} aria-label="Próxima imagem">
            <ArrowRight aria-hidden="true" size={18} />
          </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
