import type { VercelRequest, VercelResponse } from "@vercel/node";
import { RATES, MIN_OFFER, calculateOffer, type RateKey } from "../lib/rates";
import type { InquiryRecord, InquiryStatus, Method } from "../lib/types";
import { createInquiry } from "../lib/notion";
import { sendEmail } from "../lib/email";
import { autoReplyShip } from "../lib/templates/auto-reply-ship";
import { autoReplyMeetup } from "../lib/templates/auto-reply-meetup";
import { vincentNotify } from "../lib/templates/vincent-notify";

const RATE_KEYS = Object.keys(RATES) as RateKey[];

type Payload = {
  name?: unknown;
  email?: unknown;
  location?: unknown;
  method?: unknown;
  quantities?: unknown;
  hasEdgeItems?: unknown;
  edgeItemsNotes?: unknown;
  notes?: unknown;
  confirmedEnglishNM?: unknown;
};

function str(v: unknown, max = 500): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s || s.length > max) return null;
  return s;
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function parseQuantities(v: unknown): Record<RateKey, number> | null {
  if (!v || typeof v !== "object") return null;
  const obj = v as Record<string, unknown>;
  const out: Partial<Record<RateKey, number>> = {};
  for (const key of RATE_KEYS) {
    const raw = obj[key];
    const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : 0;
    if (!Number.isFinite(n) || n < 0 || n > 10_000_000) return null;
    out[key] = Math.floor(n);
  }
  return out as Record<RateKey, number>;
}

function genInquiryId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const body: Payload =
    typeof req.body === "string" ? safeJSON(req.body) : (req.body as Payload);

  const name = str(body.name, 100);
  const emailRaw = str(body.email, 200);
  const location = str(body.location, 120);
  const methodRaw = str(body.method, 16);
  const confirmedEnglishNM = body.confirmedEnglishNM === true;
  const hasEdgeItems = body.hasEdgeItems === true;
  const edgeItemsNotes = str(body.edgeItemsNotes, 2000) ?? undefined;
  const notes = str(body.notes, 2000) ?? undefined;
  const quantities = parseQuantities(body.quantities);

  if (!name) return res.status(400).json({ error: "invalid_name" });
  if (!emailRaw || !isEmail(emailRaw))
    return res.status(400).json({ error: "invalid_email" });
  if (!location) return res.status(400).json({ error: "invalid_location" });
  if (methodRaw !== "ship" && methodRaw !== "meetup")
    return res.status(400).json({ error: "invalid_method" });
  if (!quantities) return res.status(400).json({ error: "invalid_quantities" });
  if (!confirmedEnglishNM)
    return res.status(400).json({ error: "must_confirm_english_nm" });
  if (hasEdgeItems && !edgeItemsNotes)
    return res.status(400).json({ error: "edge_items_notes_required" });

  const offer = calculateOffer(quantities);
  if (offer.totalCards === 0)
    return res.status(400).json({ error: "no_cards" });
  if (offer.cardsOffer < MIN_OFFER)
    return res
      .status(400)
      .json({ error: "below_minimum", min: MIN_OFFER, offer: offer.cardsOffer });

  const method: Method = methodRaw;
  const status: InquiryStatus = hasEdgeItems
    ? "Has Edge Items"
    : method === "meetup"
      ? "Offered — Meetup"
      : "Offered — Ship";

  const record: InquiryRecord = {
    name,
    email: emailRaw,
    location,
    method,
    quantities,
    hasEdgeItems,
    edgeItemsNotes,
    notes,
    inquiryId: genInquiryId(),
    cardsOffer: offer.cardsOffer,
    shipReimbursement: offer.shipReimbursement,
    estimatedPayout: offer.estimatedPayout,
    totalCards: offer.totalCards,
    status,
    submittedAt: new Date(),
    breakdown: offer.breakdown.map(({ label, qty, subtotal }) => ({
      label,
      qty,
      subtotal,
    })),
  };

  let notionUrl: string | undefined;
  try {
    const page = await createInquiry(record);
    notionUrl = page.url;
  } catch (err) {
    console.error("notion_write_failed", { inquiryId: record.inquiryId, err });
    return res
      .status(500)
      .json({ error: "internal_error", correlationId: record.inquiryId });
  }

  const opsEmail = process.env.OPS_EMAIL;

  const autoReply =
    method === "ship" ? autoReplyShip(record) : autoReplyMeetup(record);
  const notify = vincentNotify(record, notionUrl);

  const sends: Promise<unknown>[] = [
    sendEmail({
      to: record.email,
      subject: autoReply.subject,
      text: autoReply.text,
    }).catch((e) =>
      console.error("auto_reply_failed", { inquiryId: record.inquiryId, err: e })
    ),
  ];
  if (opsEmail) {
    sends.push(
      sendEmail({
        to: opsEmail,
        subject: notify.subject,
        text: notify.text,
        replyTo: record.email,
      }).catch((e) =>
        console.error("vincent_notify_failed", {
          inquiryId: record.inquiryId,
          err: e,
        })
      )
    );
  }
  await Promise.allSettled(sends);

  res.status(200).json({
    ok: true,
    inquiryId: record.inquiryId,
    offerAmount: record.cardsOffer,
    shipReimbursement: record.shipReimbursement,
    estimatedPayout: record.estimatedPayout,
  });
}

function safeJSON(s: string): Payload {
  try {
    return JSON.parse(s) as Payload;
  } catch {
    return {};
  }
}
