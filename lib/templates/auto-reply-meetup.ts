import type { InquiryRecord } from "../types.js";
import { firstName, formatBreakdown, formatUSD } from "../format.js";

export function autoReplyMeetup(r: InquiryRecord): { subject: string; text: string } {
  const fn = firstName(r.name);
  const cards = formatUSD(r.cardsOffer);
  const breakdown = formatBreakdown(r.breakdown);

  const subject = `Your offer: ${cards} — [${r.inquiryId}]`;

  const text = `Hey ${fn},

Offer locked in: ${cards} for your collection.

BREAKDOWN
${breakdown}

───────────────────────────────
NEXT STEPS — MEETUP
───────────────────────────────

I'll reach out personally within the hour to pick a time
and spot that works for both of us.

Cash on pickup. Offer good for 7 days.

— Vincent
unpackhits.com
`;

  return { subject, text };
}
