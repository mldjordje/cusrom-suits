// hooks/useSuitConfigurator.ts
import { useReducer } from "react";

export type SuitState = {
  styleId: string;
  colorId?: string;
  buttonId?: string;
  materialId?: string;
  lapelId?: string;
  lapelWidthId?: string;
  pocketId?: string;
  interiorId?: string;
  breastPocketId?: string;
  cuffId?: string;
  showShirt?: boolean;
  pantsPleatId?: string;
};

type Action =
  | { type: "SET_STYLE"; payload: string }
  | { type: "SET_COLOR"; payload: string }
  | { type: "SET_BUTTON"; payload: string }
  | { type: "SET_MATERIAL"; payload: string }
  | { type: "SET_LAPEL"; payload: string }
  | { type: "SET_LAPEL_WIDTH"; payload: string }
  | { type: "SET_POCKET"; payload: string }
  | { type: "SET_INTERIOR"; payload: string }
  | { type: "SET_BREAST_POCKET"; payload: string }
  | { type: "SET_CUFF"; payload: string }
  | { type: "TOGGLE_SHIRT" }
  | { type: "SET_PANTS_PLEAT"; payload: string }
  | { type: "RESET" };

export function useSuitConfigurator(
  initial: SuitState = { styleId: "single_2btn", colorId: undefined }
) {
  const reducer = (state: SuitState, action: Action): SuitState => {
    switch (action.type) {
      //  Promena stila resetuje sve opcije povezane sa stilom
      case "SET_STYLE":
        return {
          ...state, // zadri postojeu boju (tkaninu) kako bi ostala selektovana
          styleId: action.payload,
          buttonId: undefined,
          materialId: undefined,
          lapelId: undefined,
          lapelWidthId: undefined,
          pocketId: undefined,
          interiorId: undefined,
          breastPocketId: undefined,
          cuffId: undefined,
        };

      //  Izbor boje/tkanine
      case "SET_COLOR":
        return { ...state, colorId: action.payload };

      //  Izbor dugmadi (trenutno ne koristi se aktivno)
      case "SET_BUTTON":
        return { ...state, buttonId: action.payload };

      //  Izbor materijala (nije aktivno odvojeno od tkanine za sada)
      case "SET_MATERIAL":
        return { ...state, materialId: action.payload };

      //  Izbor tipa revera
      case "SET_LAPEL":
        return {
          ...state,
          lapelId: action.payload,
          lapelWidthId: undefined, // resetuj irinu revera kad se promeni tip
        };

      //  Izbor irine revera
      case "SET_LAPEL_WIDTH":
        return { ...state, lapelWidthId: action.payload };

      //  Izbor stila depova
      case "SET_POCKET":
        return { ...state, pocketId: action.payload };

      //  Izbor unutranjosti sakoa
      case "SET_INTERIOR":
        return { ...state, interiorId: action.payload };

      //  Izbor opcije za grudni dep
      case "SET_BREAST_POCKET":
        return { ...state, breastPocketId: action.payload };

      //  Izbor manetni na pantalonama
      case "SET_CUFF":
        return { ...state, cuffId: action.payload };

      case "TOGGLE_SHIRT":
        return { ...state, showShirt: !state.showShirt };

      case "SET_PANTS_PLEAT":
        return { ...state, pantsPleatId: action.payload };

      //  Reset na poetno stanje
      case "RESET":
        return initial;

      default:
        return state;
    }
  };

  return useReducer(reducer, initial);
}
