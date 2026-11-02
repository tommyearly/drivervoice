import Image from "next/image";
import { illustrations, type IllustrationKey } from "@/lib/illustrations";

export type IllustrationVariant = "hero" | "public-banner" | "section-banner" | "dashboard" | "form" | "detail" | "legal";

const HERO_ALT = "Illustration of fictional drivers beside a generic unbranded bus. It is not a photograph and not a record of a real event.";
const HERO_CAPTION = "Illustration of fictional drivers and a generic bus. It is not a photograph and not evidence of a real event.";
const SECTION_CAPTION = "Generic section artwork. This illustration does not depict the events in this update.";

const frames: Record<IllustrationVariant, string> = {
  hero: "aspect-video w-full shadow-dv",
  "public-banner": "mt-6 aspect-video w-full shadow-dv",
  "section-banner": "mt-6 aspect-video w-full shadow-dv",
  dashboard: "h-24 w-[10.5rem] shrink-0 sm:h-36 sm:w-64",
  form: "mx-auto h-[4.5rem] w-32 lg:mx-0 lg:aspect-video lg:h-auto lg:w-60",
  detail: "h-14 w-24 shrink-0",
  legal: "aspect-video w-full",
};

const shells: Partial<Record<IllustrationVariant, string>> = {
  legal: "mx-auto mt-6 w-40 md:float-right md:mb-4 md:ml-6 md:mt-1 md:w-52",
};

const sizes: Record<IllustrationVariant, string> = {
  hero: "(max-width: 1024px) 100vw, 46rem",
  "public-banner": "(max-width: 768px) 100vw, 48rem",
  "section-banner": "(max-width: 768px) 100vw, 48rem",
  dashboard: "256px",
  form: "(max-width: 1024px) 128px, 240px",
  detail: "96px",
  legal: "(max-width: 768px) 160px, 208px",
};

export function PageIllustration({
  asset,
  variant,
  className = "",
  caption,
}: {
  asset: IllustrationKey;
  variant: IllustrationVariant;
  className?: string;
  caption?: string;
}) {
  const item = illustrations[asset];
  const note = caption ?? (variant === "hero" ? HERO_CAPTION : variant === "section-banner" ? SECTION_CAPTION : variant === "public-banner" || variant === "legal" ? item.caption : "");
  const decorative = variant === "dashboard" || variant === "detail" || (variant === "form" && caption === undefined);
  const alt = variant === "hero" ? HERO_ALT : decorative ? "" : item.alt;
  const image = (
    <div className={`relative overflow-hidden rounded-dv bg-white ${frames[variant]}`}>
      <Image
        src={item.src}
        alt={alt}
        fill
        priority={variant === "hero"}
        sizes={sizes[variant]}
        style={{ objectPosition: item.objectPosition }}
        className="object-contain"
      />
    </div>
  );
  const shell = [shells[variant], className].filter(Boolean).join(" ");
  if (!note) return <div className={shell}>{image}</div>;
  return (
    <figure className={shell}>
      {image}
      <figcaption className="mt-2 text-sm text-[var(--dv-muted)]">{note}</figcaption>
    </figure>
  );
}
