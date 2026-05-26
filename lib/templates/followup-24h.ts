import type { InquiryRecord } from "../types.js";
import { firstName, formatUSD } from "../format.js";

export function followup24h(r: InquiryRecord): { subject: string; text: string } {
  const fn = firstName(r.name);
  const total = formatUSD(r.estimatedPayout);

  const subject = `Got your tracking? — [${r.inquiryId}]`;

  const text = `Hey ${fn},

Checking in on your ${total} offer — haven't seen tracking
yet. Making sure my last email didn't land in Promotions
or spam.

Address:
  Unpack Hits
  8698 Elk Grove Blvd
  Ste 1-319
  Elk Grove, CA 95624-3300

Reply with tracking + PayPal email when it's out. Offer is
locked in for another 6 days.

— Vincent
`;

  return { subject, text };
}
