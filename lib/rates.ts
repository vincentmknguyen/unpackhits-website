export type RateKey =
  | "commons_uncommons"
  | "reverse_holos"
  | "v_ex_gx"
  | "vstar"
  | "vmax"
  | "art_tg_gg"
  | "full_art_special_e"
  | "jumbos";

export type Rate = { per: number; price: number; label: string };

export const RATES: Record<RateKey, Rate> = {
  commons_uncommons: { per: 1000, price: 13.0, label: "Commons & Uncommons" },
  reverse_holos: { per: 1000, price: 35.0, label: "Reverse Holos & Holos" },
  v_ex_gx: { per: 1, price: 0.5, label: "V / ex / GX" },
  vstar: { per: 1, price: 1.0, label: "VSTAR" },
  vmax: { per: 1, price: 2.0, label: "VMAX" },
  art_tg_gg: { per: 1, price: 0.75, label: "Art Rare / TG / GG" },
  full_art_special_e: { per: 1, price: 0.2, label: "Full Art Trainers / Special Energy" },
  jumbos: { per: 1, price: 0.3, label: "Jumbos" },
};

export const MIN_OFFER = 20.0;
export const SHIP_REIMBURSEMENT_PER_BOX = 28.0;
export const CARDS_PER_BOX = 6000;
export const SHIP_REIMBURSEMENT_THRESHOLD = 4500;
export const OFFER_VALIDITY_DAYS = 7;

export type Quantities = Record<RateKey, number>;

export type OfferCalculation = {
  cardsOffer: number;
  totalCards: number;
  shipReimbursement: number;
  estimatedPayout: number;
  breakdown: Array<{ key: RateKey; label: string; qty: number; subtotal: number }>;
};

export function calculateOffer(quantities: Partial<Quantities>): OfferCalculation {
  let cardsOffer = 0;
  let totalCards = 0;
  const breakdown: OfferCalculation["breakdown"] = [];

  (Object.keys(RATES) as RateKey[]).forEach((key) => {
    const rate = RATES[key];
    const qty = Math.max(0, Math.floor(quantities[key] ?? 0));
    const subtotal = (qty / rate.per) * rate.price;
    cardsOffer += subtotal;
    totalCards += qty;
    breakdown.push({ key, label: rate.label, qty, subtotal: round2(subtotal) });
  });

  const shipReimbursement =
    totalCards >= SHIP_REIMBURSEMENT_THRESHOLD
      ? Math.ceil(totalCards / CARDS_PER_BOX) * SHIP_REIMBURSEMENT_PER_BOX
      : 0;

  return {
    cardsOffer: round2(cardsOffer),
    totalCards,
    shipReimbursement: round2(shipReimbursement),
    estimatedPayout: round2(cardsOffer + shipReimbursement),
    breakdown,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
