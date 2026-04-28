import { CARDS_PER_BOX } from "./rates.js";

export function formatUSD(n: number): string {
  return (
    "$" +
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

export function formatBoxes(totalCards: number): string {
  const n = Math.ceil(totalCards / CARDS_PER_BOX);
  return `${n} box${n === 1 ? "" : "es"}`;
}

export function formatBreakdown(
  breakdown: Array<{ label: string; qty: number; subtotal: number }>
): string {
  const rows = breakdown.filter((b) => b.qty > 0);
  if (rows.length === 0) return "  (no cards entered)";
  const maxLabel = Math.max(...rows.map((r) => r.label.length));
  return rows
    .map((r) => {
      const label = r.label.padEnd(maxLabel, " ");
      const qty = formatNumber(r.qty).padStart(7, " ");
      const amt = formatUSD(r.subtotal).padStart(8, " ");
      return `  ${label}  ${qty}  →  ${amt}`;
    })
    .join("\n");
}
