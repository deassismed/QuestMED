import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Image, X } from "lucide-react";

type ImageAttachment = {
  type: "image";
  src: string;
  alt: string;
  caption?: string;
};

type QuestionWithImages = {
  attachments?: Array<ImageAttachment | { type: string }>;
  imageAlt?: string;
  imageUrl?: string;
};

function getQuestionImages(question: QuestionWithImages): ImageAttachment[] {
  const attachmentImages =
    question.attachments
      ?.filter((attachment): attachment is ImageAttachment => attachment.type === "image")
      .filter((attachment) => attachment.src.trim()) ?? [];

  if (attachmentImages.length > 0) {
    return attachmentImages;
  }

  const legacySrc = question.imageUrl?.trim();

  if (!legacySrc) {
    return [];
  }

  return [
    {
      type: "image",
      src: legacySrc,
      alt: question.imageAlt?.trim() || "Imagem associada a questao",
    },
  ];
}

export default function QuestionAttachments({ question }: { question: QuestionWithImages }) {
  const images = useMemo(() => getQuestionImages(question), [question]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selectedImage = selectedIndex === null ? null : images[selectedIndex];
  const selectedPosition = selectedIndex === null ? 0 : selectedIndex + 1;
  const hasMultipleImages = images.length > 1;

  useEffect(() => {
    if (selectedIndex !== null && selectedIndex >= images.length) {
      setSelectedIndex(null);
    }
  }, [images.length, selectedIndex]);

  useEffect(() => {
    if (!selectedImage) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedIndex(null);
      }

      if (event.key === "ArrowLeft" && hasMultipleImages) {
        setSelectedIndex((current) => (current === null ? current : (current + images.length - 1) % images.length));
      }

      if (event.key === "ArrowRight" && hasMultipleImages) {
        setSelectedIndex((current) => (current === null ? current : (current + 1) % images.length));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasMultipleImages, images.length, selectedImage]);

  if (images.length === 0) {
    return null;
  }

  function goPrevious() {
    setSelectedIndex((current) => (current === null ? current : (current + images.length - 1) % images.length));
  }

  function goNext() {
    setSelectedIndex((current) => (current === null ? current : (current + 1) % images.length));
  }

  return (
    <>
      <button className="question-attachment-button" onClick={() => setSelectedIndex(0)} type="button">
        <Image size={17} aria-hidden="true" />
        {images.length === 1 ? "Ver imagem" : `Ver imagens (${images.length})`}
      </button>

      {selectedImage && (
        <div className="modal-backdrop image-backdrop" onClick={() => setSelectedIndex(null)} role="presentation">
          <section
            aria-label={hasMultipleImages ? "Imagens da questao" : "Imagem da questao"}
            aria-modal="true"
            className="image-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <button className="close-modal-button" onClick={() => setSelectedIndex(null)} type="button" aria-label="Fechar imagem">
              <X size={20} aria-hidden="true" />
            </button>

            <figure className="question-image-viewer">
              <img alt={selectedImage.alt} src={selectedImage.src} />
              {(selectedImage.caption || hasMultipleImages) && (
                <figcaption>
                  {selectedImage.caption}
                  {hasMultipleImages && (
                    <span>
                      {selectedPosition} de {images.length}
                    </span>
                  )}
                </figcaption>
              )}
            </figure>

            {hasMultipleImages && (
              <div className="image-modal-controls">
                <button className="secondary-wide-button" onClick={goPrevious} type="button">
                  <ChevronLeft size={17} aria-hidden="true" />
                  Anterior
                </button>
                <button className="secondary-wide-button" onClick={goNext} type="button">
                  Proxima
                  <ChevronRight size={17} aria-hidden="true" />
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
