export type ButtonPosition = {
  x: number; // normalized 0-1
  y: number; // normalized 0-1
  size?: number; // optional normalized diameter relative to width
};

export type ButtonLayout = {
  styleId: string;
  layout: "1" | "2" | "3" | "4" | "6" | "8";
  area?: "front" | "sleeve" | "back_pocket";
  positions: ButtonPosition[];
};

// Fallback positions on 600x733 canvas (front) approximated from existing sprites.
// Users can override via Supabase table `button_positions`.
export const fallbackButtonLayouts: ButtonLayout[] = [
  {
    styleId: "single_1btn",
    layout: "1",
    area: "front",
    positions: [{ x: 0.524, y: 0.535, size: 0.035 }],
  },
  {
    styleId: "single_2btn",
    layout: "2",
    area: "front",
    positions: [
      { x: 0.524, y: 0.48, size: 0.035 },
      { x: 0.524, y: 0.59, size: 0.035 },
    ],
  },
  {
    styleId: "double_4btn",
    layout: "4",
    area: "front",
    positions: [
      { x: 0.44, y: 0.38, size: 0.033 },
      { x: 0.58, y: 0.40, size: 0.033 },
      { x: 0.44, y: 0.52, size: 0.033 },
      { x: 0.58, y: 0.54, size: 0.033 },
    ],
  },
  {
    styleId: "double_6btn",
    layout: "6",
    area: "front",
    positions: [
      { x: 0.44, y: 0.37, size: 0.033 },
      { x: 0.58, y: 0.39, size: 0.033 },
      { x: 0.44, y: 0.50, size: 0.033 },
      { x: 0.58, y: 0.52, size: 0.033 },
      { x: 0.44, y: 0.63, size: 0.033 },
      { x: 0.58, y: 0.65, size: 0.033 },
    ],
  },
  {
    styleId: "single_2btn",
    layout: "2",
    area: "back_pocket",
    positions: [{ x: 0.749, y: 0.574, size: 0.03 }],
  },
];

export const getFallbackPositions = (styleId: string) =>
  fallbackButtonLayouts.filter((item) => item.styleId === styleId);
