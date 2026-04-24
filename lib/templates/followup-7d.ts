import type { InquiryRecord } from "../types";
import { firstName, formatUSD } from "../format";

export function followup7d(r: InquiryRecord): { subject: string; text: string } {
  const fn = firstName(r.name);
  const total = formatUSD(r.estimatedPayout);

  const subject = `Offer expires today — [${r.inquiryId}]`;

  const text = `Hey ${fn},

Last note — your ${total} offer wraps up today.

If you sold elsewhere: no worries, hope you got a fair
price. If plans changed: totally cool. The form's always
there if you want a new quote down the road.

— Vincent
unpackhits.com
`;

  return { subject, text };
}
