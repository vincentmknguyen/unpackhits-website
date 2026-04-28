import type { InquiryRecord } from "../types.js";
import { formatBreakdown, formatUSD, formatNumber } from "../format.js";

export function vincentNotify(
  r: InquiryRecord,
  notionPageUrl?: string
): { subject: string; text: string } {
  const edgeTag = r.hasEdgeItems ? " — EDGE ITEMS" : "";
  const methodLabel = r.method === "ship" ? "ship" : "meetup";
  const subject = `[NEW${edgeTag}] ${formatUSD(r.estimatedPayout)} / ${r.name} / ${methodLabel} — [${r.inquiryId}]`;

  const text = `NEW INQUIRY — ${r.inquiryId}

Name:         ${r.name}
Email:        ${r.email} (reply-to this email to respond directly)
Location:     ${r.location}
Method:       ${r.method.toUpperCase()}
Status:       ${r.status}

────────────────────────────────

OFFER

  Cards offer:            ${formatUSD(r.cardsOffer)}
  Shipping reimbursement: ${formatUSD(r.shipReimbursement)}
  ESTIMATED PAYOUT:       ${formatUSD(r.estimatedPayout)}

  Total cards: ${formatNumber(r.totalCards)}

BREAKDOWN
${formatBreakdown(r.breakdown)}

────────────────────────────────

${
  r.hasEdgeItems
    ? `EDGE ITEMS (graded / sealed)
${r.edgeItemsNotes || "  (no notes)"}

────────────────────────────────

`
    : ""
}${
    r.notes
      ? `NOTES FROM SUBMITTER
${r.notes}

────────────────────────────────

`
      : ""
  }${notionPageUrl ? `Open in Notion: ${notionPageUrl}\n` : ""}`;

  return { subject, text };
}
