// 🔹 Osnovni sloj odela (deo slike)
export type SuitLayer = {
  id: string;
  name: string;
  src: string;
};

// 🔹 Širina revera
export type LapelWidth = {
  id: string;
  name: string;
  src: string;
};

// 🔹 Rever (lapel) – tip + širine
export type LapelOption = {
  id: string;
  name: string;
  widths: LapelWidth[];
};

// 🔹 Tip za džepove
export type PocketOption = {
  id: string;
  name: string;
  src: string;
};

// 🔹 Sloj za unutrašnjost (interior)
export type InteriorOption = {
  id: string;
  name: string;
   src?: string; 
  layers: SuitLayer[]; // svaki interior se sastoji od više slojeva
  
};

// 🔹 Grudni džep
export type BreastPocketOption = {
  id: string;
  name: string;
  src?: string;    
  layers: SuitLayer[]; // podrška za više varijanti u budućnosti
};

// 🔹 Krajevi nogavica (cuffs na pantalonama)
export type CuffOption = {
  id: string;
  name: string;
  src: string;
};

// 🔹 Glavni tip modela odela
export type SuitModel = {
  id: string;
  name: string;
  colorId: string;
  icon: string;
  layers: SuitLayer[];
  lapels: LapelOption[];
  pockets?: PocketOption[];
  interiors?: InteriorOption[];
  breastPocket?: BreastPocketOption[];
  cuffs?: CuffOption[];
};

// ======================================================
// 🔸 MODELI ODELA (Suit Models)
// ======================================================

export const suits: SuitModel[] = [
  {
    id: "single_1btn",
    name: "Jednoredno (1 dugme)",
    colorId: "blue",
    icon: "/custom-suits/icons/single_1btn.png",

    layers: [
      {
        id: "torso",
        name: "Sredina sakoa",
        src: "/assets/suits/blue/neck_single_breasted+buttons_1+lapel_medium+style_lapel_notch.png",
      },
      { id: "sleeves", name: "Rukavi", src: "/assets/suits/blue/sleeves.png" },
      {
        id: "bottom",
        name: "Donji deo sakoa",
        src: "/assets/suits/blue/bottom_single_breasted+length_long+hemline_open.png",
      },
      {
        id: "pants",
        name: "Pantalone",
        src: "/assets/suits/blue/length_long+cut_slim.png",
      },
    ],

    lapels: [
      {
        id: "notch",
        name: "Notch Lapel",
        widths: [
          {
            id: "narrow",
            name: "Narrow",
            src: "/assets/suits/blue/neck_single_breasted+buttons_1+lapel_narrow+style_lapel_notch.png",
          },
          {
            id: "medium",
            name: "Medium",
            src: "/assets/suits/blue/neck_single_breasted+buttons_1+lapel_medium+style_lapel_notch.png",
          },
          {
            id: "wide",
            name: "Wide",
            src: "/assets/suits/blue/neck_single_breasted+buttons_1+lapel_wide+style_lapel_notch.png",
          },
        ],
      },
      {
        id: "peak",
        name: "Peak Lapel",
        widths: [
          {
            id: "narrow",
            name: "Narrow",
            src: "/assets/suits/blue/neck_single_breasted+buttons_1+lapel_narrow+style_lapel_peak.png",
          },
          {
            id: "medium",
            name: "Medium",
            src: "/assets/suits/blue/neck_single_breasted+buttons_1+lapel_medium+style_lapel_peak.png",
          },
          {
            id: "wide",
            name: "Wide",
            src: "/assets/suits/blue/neck_single_breasted+buttons_1+lapel_wide+style_lapel_peak.png",
          },
        ],
      },
    ],

    pockets: [
      {
        id: "double-welted",
        name: "Double-Welted",
        src: "/assets/suits/blue/hip_pockets_double_welt+fit_slim.png",
      },
      {
        id: "patched",
        name: "Patched",
        src: "/assets/suits/blue/hip_pockets_patched+fit_slim.png",
      },
    ],

    interiors: [
      {
        id: "Blue",
        name: "Blue Interior",
        layers: [
          {
            id: "interior_base",
            name: "Base",
            src: "/assets/suits/blue/interior1.png",
          },
          {
            id: "interior_left",
            name: "Left",
            src: "/assets/suits/blue/interior2.png",
          },
          {
            id: "interior_right",
            name: "Right",
            src: "/assets/suits/blue/interior3.png",
          },
        ],
      },
      {
        id: "contrast",
        name: "Contrast Lining",
        layers: [
          {
            id: "interior_base",
            name: "Base",
            src: "/assets/suits/blue/interiorblack3.png",  // corrected filename
          },
          {
            id: "interior_left",
            name: "Left",
            src: "/assets/suits/blue/interiorblack1.png",
          },
          {
            id: "interior_right",
            name: "Right",
            src: "/assets/suits/blue/interiorblack2.png",
          },
        ],
      },
    ],

    breastPocket: [
      {
        id: "standard",
        name: "Standard Pocket",
        layers: [
          {
            id: "breast",
            name: "Breast Pocket",
            src: "/assets/suits/blue/breast_pocket_classic.png",
          },
        ],
      },
      {
        id: "none",
        name: "No Pocket",
        layers: [],
      },
    ],

    cuffs: [
      {
        id: "plain",
        name: "Without Cuffs",
        src: "/assets/suits/blue/length_long+cut_slim.png",
      },
      {
        id: "cuffed",
        name: "With Cuffs",
        src: "/assets/suits/blue/cuffs+length_long+cut_slim.png",
      },
    ],
  },

  // ---------------------------------------------------
  // Ostali modeli (isti princip)
  // ---------------------------------------------------

  {
    id: "single_2btn",
    name: "Jednoredno (2 dugmeta)",
    colorId: "blue",
    icon: "/custom-suits/icons/single_2btn.png",

    layers: [
      {
        id: "torso",
        name: "Sredina sakoa",
        src: "/assets/suits/blue/neck_single_breasted+buttons_2+lapel_medium+style_lapel_notch.png",
      },
      { id: "sleeves", name: "Rukavi", src: "/assets/suits/blue/sleeves.png" },
      {
        id: "bottom",
        name: "Donji deo sakoa",
        src: "/assets/suits/blue/bottom_single_breasted+length_long+hemline_open.png",
      },
      {
        id: "pants",
        name: "Pantalone",
        src: "/assets/suits/blue/length_long+cut_slim.png",
      },
    ],

    lapels: [
      {
        id: "notch",
        name: "Notch Lapel",
        widths: [
          {
            id: "medium",
            name: "Medium",
            src: "/assets/suits/blue/neck_single_breasted+buttons_2+lapel_medium+style_lapel_notch.png",
          },
        ],
      },
      {
        id: "peak",
        name: "Peak Lapel",
        widths: [
          {
            id: "medium",
            name: "Medium",
            src: "/assets/suits/blue/neck_single_breasted+buttons_2+lapel_medium+style_lapel_peak.png",
          },
        ],
      },
    ],

    pockets: [
      {
        id: "double-welted",
        name: "Double-Welted",
        src: "/assets/suits/blue/hip_pockets_double_welt+fit_slim.png",
      },
      {
        id: "patched",
        name: "Patched",
        src: "/assets/suits/blue/hip_pockets_patched+fit_slim.png",
      },
    ],

    interiors: [
      {
        id: "Blue",
        name: "Blue Interior",
        layers: [
          {
            id: "interior_base",
            name: "Base",
            src: "/assets/suits/blue/interior1.png",
          },
          {
            id: "interior_left",
            name: "Left",
            src: "/assets/suits/blue/interior2.png",
          },
          {
            id: "interior_right",
            name: "Right",
            src: "/assets/suits/blue/interior3.png",
          },
        ],
      },
      {
        id: "contrast",
        name: "Contrast Lining",
        layers: [
          {
            id: "interior_base",
            name: "Base",
            src: "/assets/suits/blue/interiorblack3.png",
          },
          {
            id: "interior_left",
            name: "Left",
            src: "/assets/suits/blue/interiorblack1.png",
          },
          {
            id: "interior_right",
            name: "Right",
            src: "/assets/suits/blue/interiorblack2.png",
          },
        ],
      },
    ],

    breastPocket: [
      {
        id: "standard",
        name: "Standard Pocket",
        layers: [
          {
            id: "breast",
            name: "Breast Pocket",
            src: "/assets/suits/blue/breast_pocket_classic.png",
          },
        ],
      },
      {
        id: "none",
        name: "No Pocket",
        layers: [],
      },
    ],

    cuffs: [
      {
        id: "plain",
        name: "Without Cuffs",
        src: "/assets/suits/blue/length_long+cut_slim.png",
      },
      {
        id: "cuffed",
        name: "With Cuffs",
        src: "/assets/suits/blue/cuffs+length_long+cut_slim.png",
      },
    ],
  },

  {
    id: "double_4btn",
    name: "Dvoredno (4 dugmeta)",
    colorId: "blue",
    icon: "/custom-suits/icons/double_4btn.png",

    layers: [
      {
        id: "torso",
        name: "Sredina sakoa",
        // Use transparent torso sprites so peak/notch swaps are available
        src: "/assets/suits/transparent/neck_double_breasted+buttons_4+lapel_medium+style_lapel_notch.png",
      },
      { id: "sleeves", name: "Rukavi", src: "/assets/suits/blue/sleeves.png" },
      {
        id: "bottom",
        name: "Donji deo sakoa",
        src: "/assets/suits/blue/bottom_double_breasted+length_long.png",
      },
      {
        id: "pants",
        name: "Pantalone",
        src: "/assets/suits/blue/length_long+cut_slim.png",
      },
    ],

    lapels: [
      {
        id: "notch",
        name: "Notch Lapel",
        widths: [
          {
            id: "medium",
            name: "Medium",
            src: "/assets/suits/transparent/neck_double_breasted+buttons_4+lapel_medium+style_lapel_notch.png",
          },
        ],
      },
      {
        id: "peak",
        name: "Peak Lapel",
        widths: [
          {
            id: "medium",
            name: "Medium",
            src: "/assets/suits/transparent/neck_double_breasted+buttons_4+lapel_medium+style_lapel_peak.png",
          },
        ],
      },
    ],

    pockets: [
      {
        id: "double-welted",
        name: "Double-Welted",
        src: "/assets/suits/blue/hip_pockets_double_welt+fit_slim.png",
      },
      {
        id: "patched",
        name: "Patched",
        src: "/assets/suits/blue/hip_pockets_patched+fit_slim.png",
      },
    ],

    interiors: [
      {
        id: "Blue",
        name: "Blue Interior",
        layers: [
          {
            id: "interior_base",
            name: "Base",
            src: "/assets/suits/blue/interior1.png",
          },
          {
            id: "interior_left",
            name: "Left",
            src: "/assets/suits/blue/interior2.png",
          },
          {
            id: "interior_right",
            name: "Right",
            src: "/assets/suits/blue/interior3.png",
          },
        ],
      },
      {
        id: "contrast",
        name: "Contrast Lining",
        layers: [
          {
            id: "interior_base",
            name: "Base",
            src: "/assets/suits/blue/interiorblack3.png",
          },
          {
            id: "interior_left",
            name: "Left",
            src: "/assets/suits/blue/interiorblack1.png",
          },
          {
            id: "interior_right",
            name: "Right",
            src: "/assets/suits/blue/interiorblack2.png",
          },
        ],
      },
    ],

    breastPocket: [
      {
        id: "standard",
        name: "Standard Pocket",
        layers: [
          {
            id: "breast",
            name: "Breast Pocket",
            src: "/assets/suits/blue/breast_pocket_classic.png",
          },
        ],
      },
      {
        id: "none",
        name: "No Pocket",
        layers: [],
      },
    ],

    cuffs: [
      {
        id: "plain",
        name: "Without Cuffs",
        src: "/assets/suits/blue/length_long+cut_slim.png",
      },
      {
        id: "cuffed",
        name: "With Cuffs",
        src: "/assets/suits/blue/cuffs+length_long+cut_slim.png",
      },
    ],
  },
];

// ======================================================
// 🔸 FABRICS (teksture tkanina)
// ======================================================

export const fabrics = [
  {
    id: "cream",
    name: "Krem vunena tkanina",
    texture: "/custom-suits/fabrics/cream.jpg",
  },
  {
    id: "1",
    name: "Svetla lanena tkanina",
    texture: "/custom-suits/fabrics/1.png",
  },
  {
    id: "2",
    name: "Sivo-crna tkanina (tvil)",
    texture: "/custom-suits/fabrics/2.png",
  },
  {
    id: "blue",
    name: "Plava vunena tkanina",
    texture: "/custom-suits/fabrics/3.png",
  },
  {
    id: "4",
    name: "Tamnozelena vunena tkanina",
    texture: "/custom-suits/fabrics/4.png",
  },
];
