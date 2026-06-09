import type { LandingSettings } from "@/lib/catalog/landingSettings";

export type UniformImage = { title?: string; image: string; alt?: string; gallery?: string[] };
export type UniformVideo = { title?: string; video: string; poster?: string; alt?: string };
export type UniformDocument = { title: string; titleEn: string; file: string };

const u = (f: string) => `/fajlovi/uniforme/${f}`;

// Bundled media from public/fajlovi/uniforme/. Used when admin settings are empty.
// Each item's gallery[] = images specific to that outfit (from old-site PHP groupings).
export const BUNDLED_UNIFORM_IMAGES: UniformImage[] = [
  {
    title: "Hospitality kolekcija",
    image: u("BRI04849.jpg"),
    alt: "Santos poslovna uniforma za hospitality tim",
    gallery: [u("BRI04849.jpg"), u("BRI04854.jpg"), u("BRI04852.jpg"), u("BRI04860.jpg")],
  },
  {
    title: "Recepcija i menadzment",
    image: u("BRI04875.jpg"),
    alt: "Santos poslovna uniforma za recepciju i menadzment",
    gallery: [u("BRI04875.jpg"), u("BRI04873.jpg"), u("BRI04877.jpg"), u("BRI04880.jpg")],
  },
  {
    title: "Elegantna kolekcija",
    image: u("BRI04929.jpg"),
    alt: "Santos elegantna poslovna uniforma",
    gallery: [u("BRI04929.jpg"), u("BRI04927.jpg"), u("BRI04931.jpg"), u("BRI04933.jpg")],
  },
  {
    title: "Pantalone i jakna",
    image: u("BRI04939.jpg"),
    alt: "Santos poslovna uniforma pantalone i jakna",
    gallery: [u("BRI04939.jpg"), u("BRI04997.jpg"), u("BRI04998.jpg"), u("BRI04933.jpg")],
  },
  {
    title: "Timski setovi",
    image: u("BRI04963.jpg"),
    alt: "Santos poslovne uniforme za kompanijske timove",
    gallery: [u("BRI04963.jpg"), u("BRI04971.jpg"), u("BRI04962.jpg"), u("BRI04966.jpg")],
  },
  {
    title: "Uniforma za timove",
    image: u("BRI04988.jpg"),
    alt: "Santos komplet poslovne uniforme za timove",
    gallery: [u("BRI04988.jpg"), u("BRI04987.jpg"), u("BRI04977.jpg"), u("BRI04980.jpg"), u("BRI04985.jpg")],
  },
  {
    title: "Muski komplet",
    image: u("BRI04787.jpg"),
    alt: "Santos muski poslovni komplet",
    gallery: [u("BRI04787.jpg"), u("BRI04793.jpg"), u("BRI04795.jpg"), u("BRI04785.jpg"), u("BRI04786.jpg")],
  },
  {
    title: "Sako i suknja",
    image: u("BRI04820.jpg"),
    alt: "Santos poslovna uniforma sako i suknja",
    gallery: [u("BRI04820.jpg"), u("BRI04823.jpg"), u("BRI04829.jpg"), u("BRI04832.jpg"), u("BRI04841.jpg")],
  },
  {
    title: "Kosulja i kravata",
    image: u("BRI04807.jpg"),
    alt: "Santos poslovna kosulja i kravata",
    gallery: [u("BRI04807.jpg"), u("BRI04802.jpg"), u("BRI04814.jpg"), u("BRI04812.jpg"), u("BRI04806.jpg")],
  },
  {
    title: "Kolekcija haljina",
    image: u("BRI05003.jpg"),
    alt: "Santos poslovna uniforma kolekcija haljina",
    gallery: [u("BRI05003.jpg"), u("BRI05005.jpg"), u("BRI05008.jpg"), u("BRI05007.jpg"), u("BRI05009.jpg")],
  },
  {
    title: "Zimska kolekcija",
    image: u("BRI04762.jpg"),
    alt: "Santos zimska poslovna uniforma",
    gallery: [u("BRI04762.jpg"), u("BRI04763.jpg"), u("BRI04764.jpg"), u("BRI04766.jpg"), u("BRI04775.jpg")],
  },
  {
    title: "Plave uniforme",
    image: u("BRI04907.jpg"),
    alt: "Santos plave poslovne uniforme",
    gallery: [u("BRI04907.jpg"), u("BRI04908.jpg"), u("BRI04952.jpg"), u("BRI04901.jpg"), u("BRI04903.jpg")],
  },
];

export const BUNDLED_UNIFORM_VIDEOS: UniformVideo[] = [
  {
    title: "Zenska uniforma mantil",
    video: u("Santos%20zenska%20uniforma%20mantil.mp4"),
    poster: u("BRI04849.jpg"),
    alt: "Santos video prezentacija zenske poslovne uniforme",
  },
  {
    title: "Kosulja kratak rukav",
    video: u("Santos%20uniforma%20kosulja%20kratak%20rukav.mp4"),
    poster: u("BRI04875.jpg"),
    alt: "Santos video prezentacija poslovne kosulje kratkog rukava",
  },
  {
    title: "Pantalone i jakna",
    video: u("Santos%20uniforma%20pantalone%20jakna.mp4"),
    poster: u("BRI04939.jpg"),
    alt: "Santos video prezentacija kompleta pantalone i jakna",
  },
  {
    title: "Muski mantil",
    video: u("Santos%20uniforma%20%20muski%20mantil.mp4"),
    poster: u("BRI04787.jpg"),
    alt: "Santos video prezentacija muskog mantila",
  },
  {
    title: "Uniforma mantil",
    video: u("Santos%20uniforma%20mantil.mp4"),
    poster: u("BRI04988.jpg"),
    alt: "Santos video prezentacija uniforme sa mantilom",
  },
  {
    title: "Sako, suknja i marama",
    video: u("Santos%20uniforma%20sako%20suknja%20marama.mp4"),
    poster: u("BRI04820.jpg"),
    alt: "Santos video prezentacija sako suknja marama",
  },
  {
    title: "Haljina",
    video: u("Santos%20uniforma%20haljina.mp4"),
    poster: u("BRI05003.jpg"),
    alt: "Santos video prezentacija poslovne haljine",
  },
  {
    title: "Crna muska kosulja",
    video: u("Santos%20uniforma%20crna%20muska%20kosulja%20crna.mp4"),
    poster: u("BRI04807.jpg"),
    alt: "Santos video prezentacija crne muske poslovne kosulje",
  },
];

export const BUNDLED_UNIFORM_DOCUMENTS: UniformDocument[] = [
  {
    title: "Santos & Santorini prezentacija",
    titleEn: "Santos & Santorini presentation",
    file: u("Santos%26Santorini%20prezentacija1%20.pdf"),
  },
  {
    title: "Katalog poslovnih uniformi (srp)",
    titleEn: "Business uniforms catalogue (srp)",
    file: u("Santos%26Santorini%20srp1.pdf"),
  },
  {
    title: "Prezentacija S&S",
    titleEn: "S&S presentation",
    file: u("prez%20S%26S.pdf"),
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
  gallery: string[];
};

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

    // Use per-product gallery if provided, otherwise fall back to all images (admin-configured items)
    const gallery = item.gallery
      ? [cover, ...item.gallery.filter((img) => img !== cover)]
      : [cover, ...allImages.filter((img) => img !== cover)];

    return {
      slug: `${baseSlug}-${index + 1}`,
      title,
      description: item.alt ? localize(item.alt) : "",
      cover,
      gallery,
    };
  });
};
