import type { InquiryRecord } from "../types.js";
import { firstName, formatUSD } from "../format.js";

export function followup72h(r: InquiryRecord): { subject: string; text: string } {
  const fn = firstName(r.name);
  const total = formatUSD(r.estimatedPayout);

  const subject = `4 days left on your ${total} — [${r.inquiryId}]`;

  const text = `Hey ${fn},

Your ${total} payout is still waiting, but the clock's ticking —
4 days left on the offer.

Worth remembering:

  • I cover your shipping — $28/box reimbursed in the payout.
  • PayPal within 5 business days of receipt.
  • 500+ collections bought. Every seller gets paid.

Ship to:
  Unpack Hits
  3126 Glen Alto Ct
  San Jose, CA 95148

Reply with tracking + PayPal email when ready.

— Vincent
`;

  return { subject, text };
}
