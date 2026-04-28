import type { InquiryRecord } from "../types.js";
import { firstName, formatBreakdown, formatUSD, formatBoxes } from "../format.js";

export function autoReplyShip(r: InquiryRecord): { subject: string; text: string } {
  const fn = firstName(r.name);
  const cards = formatUSD(r.cardsOffer);
  const ship = formatUSD(r.shipReimbursement);
  const total = formatUSD(r.estimatedPayout);
  const boxes = formatBoxes(r.totalCards);
  const breakdown = formatBreakdown(r.breakdown);

  const subject = `Your offer: ${total} — [${r.inquiryId}]`;

  const shipLine =
    r.shipReimbursement > 0
      ? `  Shipping reimbursement: ${ship}   (covers ${boxes})\n  ESTIMATED PAYOUT:       ${total}`
      : `  ESTIMATED PAYOUT:       ${total}`;

  const text = `Hey ${fn},

Offer locked in.

  Cards offer:            ${cards}
${shipLine}

BREAKDOWN
${breakdown}

───────────────────────────────
PACKING
───────────────────────────────

Sleeves cause delays or rejections. Don't sleeve. Instead:

  • Team bag anything better than Commons/Uncommons and
    Reverse/Holos (so V, ex, GX, VSTAR, VMAX, Art Rares,
    Full Art Trainers).
  • Exception: high-end singles or graded cards — sleeves
    and toploaders are fine for those specifically.
  • Add VOID FILL — packing paper, crumpled newspaper, or
    bubble wrap — so cards don't shift in transit.
  • Tuck a slip of paper inside the box with your name and
    the email you used to submit, so I can match your box to
    your offer if the shipping label gets damaged.

───────────────────────────────
RECOMMENDED BOX + LABEL
───────────────────────────────

Box: USPS Priority Mail Large Flat Rate Box (fits 6,000–7,000
unsleeved cards). Free at any USPS or order here:
  https://store.usps.com/store/product/shipping-supplies/priority-mail-flat-rate-large-box-P_LARGE_FRB

Label: I recommend Pirate Ship for the cheapest USPS rates:
  https://pirateship.com

───────────────────────────────
SHIP TO
───────────────────────────────

  Unpack Hits
  PO BOX 525
  Union City, CA 94587

───────────────────────────────
WHAT I NEED BACK FROM YOU
───────────────────────────────

Just reply to this email with:
  1. Your tracking number
  2. The PayPal email I should send payment to

───────────────────────────────
HOW YOU GET PAID
───────────────────────────────

Within 5 business days of your package arriving, I verify
the cards and send PayPal for the full payout (cards offer${r.shipReimbursement > 0 ? " + shipping reimbursement" : ""}).

Offer is good for 7 days.

Questions? Just reply.

— Vincent
unpackhits.com
`;

  return { subject, text };
}
