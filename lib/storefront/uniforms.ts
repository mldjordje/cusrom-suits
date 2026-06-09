import type { LandingSettings } from "@/lib/catalog/landingSettings";

export type UniformImage = { title?: string; image: string; alt?: string };
export type UniformVideo = { title?: string; video: string; poster?: string; alt?: string };
export type UniformDocument = { title: string; titleEn: string; file: string };

// Bundled media from public/fajlovi/uniforme/. Used when admin settings are empty
// (e.g. an empty production database), so the page is never blank.
export const BUNDLED_UNIFORM_IMAGES: UniformImage[] = [
  { title: "Hospitality kolekcija", image: "/fajlovi/uniforme/BRI04849.jpg", alt: "Santos poslovna uniforma za hospitality tim" },
  { title: "Recepcija i menadzment", image: "/fajlovi/uniforme/BRI04875.jpg", alt: "Santos poslovna uniforma za recepciju" },
  { title: "Zenska uniforma mantil", image: "/fajlovi/uniforme/BRI04899.jpg", alt: "Santos zenska poslovna uniforma mantil" },
  { title: "Pantalone i jakna", image: "/fajlovi/uniforme/BRI04939.jpg", alt: "Santos poslovna uniforma pantalone i jakna" },
  { title: "Timski setovi", image: "/fajlovi/uniforme/BRI04963.jpg", alt: "Santos poslovne uniforme za kompanijske timove" },
  { title: "Uniforma za timove", image: "/fajlovi/uniforme/BRI04988.jpg", alt: "Santos komplet poslovne uniforme za timove" },
  { title: "Muski komplet", image: "/fajlovi/uniforme/BRI04786.jpg", alt: "Santos muski poslovni komplet" },
  { title: "Sako i suknja", image: "/fajlovi/uniforme/BRI04820.jpg", alt: "Santos poslovna uniforma sako i suknja" },
  { title: "Kosulja i kravata", image: "/fajlovi/uniforme/BRI04807.jpg", alt: "Santos poslovna kosulja i kravata" },
  { title: "Kolekcija haljina", image: "/fajlovi/uniforme/BRI04927.jpg", alt: "Santos poslovna uniforma kolekcija haljina" },
  { title: "Zimska kolekcija", image: "/fajlovi/uniforme/BRI04762.jpg", alt: "Santos zimska poslovna uniforma" },
  { title: "Plave uniforme", image: "/fajlovi/uniforme/BRI04980.jpg", alt: "Santos plave poslovne uniforme" },
];

export const BUNDLED_UNIFORM_VIDEOS: UniformVideo[] = [
  {
    title: "Zenska uniforma mantil",
    video: "/fajlovi/uniforme/Santos%20zenska%20uniforma%20mantil.mp4",
    poster: "/fajlovi/uniforme/BRI04899.jpg",
    alt: "Santos video prezentacija zenske poslovne uniforme",
  },
  {
    title: "Kosulja kratak rukav",
    video: "/fajlovi/uniforme/Santos%20uniforma%20kosulja%20kratak%20rukav.mp4",
    poster: "/fajlovi/uniforme/BRI04875.jpg",
    alt: "Santos video prezentacija poslovne kosulje kratkog rukava",
  },
  {
    title: "Pantalone i jakna",
    video: "/fajlovi/uniforme/Santos%20uniforma%20pantalone%20jakna.mp4",
    poster: "/fajlovi/uniforme/BRI04939.jpg",
    alt: "Santos video prezentacija kompleta pantalone i jakna",
  },
  {
    title: "Muski mantil",
    video: "/fajlovi/uniforme/Santos%20uniforma%20%20muski%20mantil.mp4",
    poster: "/fajlovi/uniforme/BRI04786.jpg",
    alt: "Santos video prezentacija muskog mantila",
  },
  {
    title: "Uniforma mantil",
    video: "/fajlovi/uniforme/Santos%20uniforma%20mantil.mp4",
    poster: "/fajlovi/uniforme/BRI04988.jpg",
    alt: "Santos video prezentacija uniforme sa mantilom",
  },
  {
    title: "Sako, suknja i marama",
    video: "/fajlovi/uniforme/Santos%20uniforma%20sako%20suknja%20marama.mp4",
    poster: "/fajlovi/uniforme/BRI04820.jpg",
    alt: "Santos video prezentacija sako suknja marama",
  },
  {
    title: "Haljina",
    video: "/fajlovi/uniforme/Santos%20uniforma%20haljina.mp4",
    poster: "/fajlovi/uniforme/BRI04927.jpg",
    alt: "Santos video prezentacija poslovne haljine",
  },
  {
    title: "Crna muska kosulja",
    video: "/fajlovi/uniforme/Santos%20uniforma%20crna%20muska%20kosulja%20crna.mp4",
    poster: "/fajlovi/uniforme/BRI04807.jpg",
    alt: "Santos video prezentacija crne muske poslovne kosulje",
  },
];

export const BUNDLED_UNIFORM_DOCUMENTS: UniformDocument[] = [
  {
    title: "Santos & Santorini prezentacija",
    titleEn: "Santos & Santorini presentation",
    file: "/fajlovi/uniforme/Santos%26Santorini%20prezentacija1%20.pdf",
  },
  {
    title: "Katalog poslovnih uniformi (srp)",
    titleEn: "Business uniforms catalogue (srp)",
    file: "/fajlovi/uniforme/Santos%26Santorini%20srp1.pdf",
  },
  {
    title: "Prezentacija S&S",
    titleEn: "S&S presentation",
    file: "/fajlovi/uniforme/prez%20S%26S.pdf",
  },
];

export const toUniformSlug = (value: string) =>
  (value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

export const resolveUniformImages = (settings: LandingSettings): UniformImage[] => {
  const configured = settings.uniformsImages.filter((item) => item.image);
  if (!configured.length) {
    const posterImages = settings.uniformsVideos
      .filter((item) => item.poster)
      .map((item) => ({
        title: item.title,
        image: String(item.poster || ""),
        alt: item.alt,
      }));
    if (posterImages.length) return posterImages;
  }
  return configured.length ? configured : BUNDLED_UNIFORM_IMAGES;
};

export const resolveUniformVideos = (settings: LandingSettings): UniformVideo[] => {
  const configured = settings.uniformsVideos.filter((item) => item.video);
  return configured.length ? configured : BUNDLED_UNIFORM_VIDEOS;
};

export type UniformProduct = {
  slug: string;
  title: string;
  description: string;
  cover: string;
  /** This model's image first, then the rest of the collection. */
  gallery: string[];
};

/** Builds the uniform "products" with stable slugs and a multi-image gallery.
 *  `localize` localizes title/alt text (pass the page's tx helper). */
export const buildUniformProducts = (
  images: UniformImage[],
  localize: (value: string, fallbackEn?: string) => string,
  isEn: boolean,
): UniformProduct[] => {
  const allImages = Array.from(
    new Set(images.map((item) => String(item.image || "").trim()).filter((value) => value.length > 0)),
  );

  return images.map((item, index) => {
    const title =
      localize(item.title || "", isEn ? "Business uniform" : undefined) ||
      (isEn ? "Business uniform" : "Poslovna uniforma");
    const baseSlug = toUniformSlug(item.title || item.alt || `uniform-${index + 1}`) || `uniform-${index + 1}`;
    const cover = item.image;
    const gallery = [cover, ...allImages.filter((image) => image !== cover)];
    return {
      slug: `${baseSlug}-${index + 1}`,
      title,
      description: item.alt ? localize(item.alt) : "",
      cover,
      gallery,
    };
  });
};
