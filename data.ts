export type SuitModel = "single_2btn" | "double_6btn";
export type SuitColor = "blue";

export const models: { id: SuitModel; label: string }[] = [
  { id: "single_2btn", label: "Jednoredno · 2 dugmeta" },
  { id: "double_6btn", label: "Dvoredno · 6 dugmadi" },
];

export const colors: { id: SuitColor; label: string }[] = [
  { id: "blue", label: "Plavo" },
];

export const previewMap: Record<SuitModel, Record<SuitColor, string>> = {
  single_2btn: {
    blue: "/assets/suits/blue/neck_single_breasted+buttons_2+lapel_medium+style_lapel_notch.png",
  },
  double_6btn: {
    blue: "/assets/suits/blue/neck_double_breasted+buttons_6+lapel_medium+style_lapel_notch.png",
  },
};
