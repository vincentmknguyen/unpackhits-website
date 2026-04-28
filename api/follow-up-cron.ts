import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  queryShipCandidates,
  recordFollowUpSent,
  setStatus,
  type CandidateRow,
} from "../lib/notion.js";
import { sendEmail } from "../lib/email.js";
import { followup24h } from "../lib/templates/followup-24h.js";
import { followup72h } from "../lib/templates/followup-72h.js";
import { followup7d } from "../lib/templates/followup-7d.js";
import type { FollowUpStage, InquiryRecord } from "../lib/types.js";

const HOUR_MS = 60 * 60 * 1000;
const THRESHOLDS: Record<FollowUpStage, number> = {
  "24h": 24 * HOUR_MS,
  "72h": 72 * HOUR_MS,
  "7d": 168 * HOUR_MS,
};

function nextStage(
  row: CandidateRow,
  now: Date
): FollowUpStage | null {
  const since = now.getTime() - row.lastCustomerContact.getTime();
  const ordered: FollowUpStage[] = ["24h", "72h", "7d"];
  for (const stage of ordered) {
    if (row.followUpsSent.includes(stage)) continue;
    if (since >= THRESHOLDS[stage]) return stage;
    return null;
  }
  return null;
}

function templateFor(stage: FollowUpStage) {
  if (stage === "24h") return followup24h;
  if (stage === "72h") return followup72h;
  return followup7d;
}

function rowToRecord(row: CandidateRow): InquiryRecord {
  return {
    name: row.name,
    email: row.email,
    location: "",
    method: row.method,
    quantities: {
      commons_uncommons: 0,
      reverse_holos: 0,
      v_ex_gx: 0,
      vstar: 0,
      vmax: 0,
      art_tg_gg: 0,
      full_art_special_e: 0,
      jumbos: 0,
    },
    hasEdgeItems: false,
    inquiryId: row.inquiryId,
    cardsOffer: row.cardsOffer,
    shipReimbursement: row.shipReimbursement,
    estimatedPayout: row.estimatedPayout,
    totalCards: row.totalCards,
    status: row.status,
    submittedAt: row.lastCustomerContact,
    breakdown: [],
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    res.status(500).json({ error: "cron_secret_not_configured" });
    return;
  }
  const authz = req.headers.authorization ?? "";
  if (authz !== `Bearer ${expected}`) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const now = new Date();
  let rows: CandidateRow[];
  try {
    rows = await queryShipCandidates();
  } catch (err) {
    console.error("notion_query_failed", err);
    res.status(500).json({ error: "notion_query_failed" });
    return;
  }

  const sent: Array<{ inquiryId: string; stage: FollowUpStage }> = [];
  const errors: Array<{ inquiryId: string; err: string }> = [];

  for (const row of rows) {
    const stage = nextStage(row, now);
    if (!stage) continue;
    if (!row.email) continue;

    try {
      const tmpl = templateFor(stage)(rowToRecord(row));
      await sendEmail({
        to: row.email,
        subject: tmpl.subject,
        text: tmpl.text,
      });
      await recordFollowUpSent(row.pageId, stage, row.followUpsSent);
      if (stage === "7d") {
        await setStatus(row.pageId, "Lost-Silent");
      }
      sent.push({ inquiryId: row.inquiryId, stage });
      console.log("followup_sent", { inquiryId: row.inquiryId, stage });
      await sleep(500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ inquiryId: row.inquiryId, err: msg });
      console.error("followup_failed", {
        inquiryId: row.inquiryId,
        stage,
        err: msg,
      });
    }
  }

  res.status(200).json({
    ok: true,
    evaluated: rows.length,
    sent,
    errors,
  });
}
