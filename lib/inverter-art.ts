import type { Engineer } from "./types";

/** An engineer record (or a subset of it) that can carry a card artwork. */
export interface ArtSource {
  productExpertise: string[];
  /** Engineer-chosen artwork. Empty string / undefined = pick automatically. */
  cardArt?: string | null;
}

export interface InverterArtOption {
  /** Value stored on the engineer record. */
  value: string;
  label: string;
  src: string;
}

/** Artwork per product category — used when the engineer has not picked one. */
export const INVERTER_ART_BY_CATEGORY: Record<string, string> = {
  string_inverter: "/inverters/string-inverter.svg",
  central_inverter: "/inverters/central-inverter.svg",
  hybrid_inverter: "/inverters/hybrid-inverter.svg",
  micro_inverter: "/inverters/micro-inverter.svg",
  pump_inverter: "/inverters/pump-inverter.svg",
};

export const DEFAULT_INVERTER_ART = "/inverters/string-inverter.svg";

/** Sentinel value meaning "pick the artwork from my product expertise". */
export const AUTO_ART_VALUE = "";

/** Options offered to engineers when they personalise their card background. */
export const INVERTER_ART_OPTIONS: InverterArtOption[] = [
  { value: AUTO_ART_VALUE, label: "Auto (from my expertise)", src: DEFAULT_INVERTER_ART },
  { value: "/inverters/string-inverter.svg", label: "String inverter", src: "/inverters/string-inverter.svg" },
  { value: "/inverters/central-inverter.svg", label: "Central inverter", src: "/inverters/central-inverter.svg" },
  { value: "/inverters/hybrid-inverter.svg", label: "Hybrid + battery", src: "/inverters/hybrid-inverter.svg" },
  { value: "/inverters/micro-inverter.svg", label: "Micro inverters", src: "/inverters/micro-inverter.svg" },
  { value: "/inverters/pump-inverter.svg", label: "Pump inverter", src: "/inverters/pump-inverter.svg" },
];

/**
 * Artwork painted behind the engineer's photo in the card banners.
 * Uses the engineer's own choice when set, otherwise falls back to the
 * illustration that matches their primary product expertise.
 */
export function inverterArtFor(engineer: ArtSource): string {
  if (engineer.cardArt) return engineer.cardArt;
  for (const category of engineer.productExpertise) {
    const art = INVERTER_ART_BY_CATEGORY[category];
    if (art) return art;
  }
  return DEFAULT_INVERTER_ART;
}

/** Artwork the engineer would get with the "Auto" option. */
export function autoInverterArtFor(engineer: Pick<Engineer, "productExpertise">): string {
  return inverterArtFor({ productExpertise: engineer.productExpertise });
}
