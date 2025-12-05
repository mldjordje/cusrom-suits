export type ButtonPosition = {
  x: number; // normalized 0-1
  y: number; // normalized 0-1
  size?: number; // optional normalized diameter relative to width
};

export type ButtonLayout = {
  styleId: string;
  layout: "1" | "2" | "3" | "4" | "6" | "8";
  area?: "front" | "sleeve" | "back_pocket" | "pants";
  positions: ButtonPosition[];
};

// Fallback positions on 600x733 canvas (front) approximated from existing sprites.
// Users can override via Supabase table `button_positions`.
export const fallbackButtonLayouts: ButtonLayout[] = [
  {
    styleId: "single_1btn",
    layout: "1",
    area: "front",
    positions: [{ x: 0.52, y: 0.53, size: 0.022 }],
  },
  {
    styleId: "single_2btn",
    layout: "2",
    area: "front",
    positions: [
      { x: 0.513, y: 0.445, size: 0.022 },
      { x: 0.513, y: 0.565, size: 0.022 },
    ],
  },
  {
    styleId: "double_4btn",
    layout: "4",
    area: "front",
    positions: [
      { x: 0.455, y: 0.40, size: 0.022 },
      { x: 0.585, y: 0.42, size: 0.022 },
      { x: 0.455, y: 0.525, size: 0.022 },
      { x: 0.585, y: 0.545, size: 0.022 },
    ],
  },
  {
    styleId: "double_6btn",
    layout: "6",
    area: "front",
    positions: [
      { x: 0.455, y: 0.385, size: 0.022 },
      { x: 0.585, y: 0.405, size: 0.022 },
      { x: 0.455, y: 0.50, size: 0.022 },
      { x: 0.585, y: 0.52, size: 0.022 },
      { x: 0.455, y: 0.615, size: 0.022 },
      { x: 0.585, y: 0.635, size: 0.022 },
    ],
  },
  {
    styleId: "single_2btn",
    layout: "2",
    area: "pants",
    positions: [
      { x: 0.82, y: 0.565, size: 0.018 },
      { x: 0.86, y: 0.205, size: 0.018 },
    ],
  },
];

export const getFallbackPositions = (styleId: string) =>
  fallbackButtonLayouts.filter((item) => item.styleId === styleId);
