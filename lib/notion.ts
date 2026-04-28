import { Client } from "@notionhq/client";
import type { FollowUpStage, InquiryRecord, InquiryStatus } from "./types.js";

const DB_ID_ENV = "NOTION_DATABASE_ID";
const TOKEN_ENV = "NOTION_TOKEN";

let _notion: Client | null = null;
function client(): Client {
  if (_notion) return _notion;
  const token = process.env[TOKEN_ENV];
  if (!token) throw new Error(`${TOKEN_ENV} not set`);
  _notion = new Client({ auth: token });
  return _notion;
}

function dbId(): string {
  const id = process.env[DB_ID_ENV];
  if (!id) throw new Error(`${DB_ID_ENV} not set`);
  return id;
}

function isoDate(d: Date): string {
  return d.toISOString();
}

function titleFor(r: InquiryRecord): string {
  const date = r.submittedAt.toISOString().slice(0, 10);
  const amt = r.estimatedPayout.toFixed(2);
  return `${r.name} — ${date} — $${amt}`;
}

export async function createInquiry(
  r: InquiryRecord
): Promise<{ pageId: string; url: string }> {
  const page = await client().pages.create({
    parent: { database_id: dbId() },
    properties: {
      Name: {
        title: [{ type: "text", text: { content: titleFor(r) } }],
      },
      Status: { select: { name: r.status } },
      "Submitter Email": { email: r.email },
      Location: { rich_text: [{ type: "text", text: { content: r.location } }] },
      Method: { select: { name: r.method === "ship" ? "Ship" : "Meetup" } },
      "Offer Amount": { number: r.cardsOffer },
      "Ship Reimbursement": { number: r.shipReimbursement },
      "Estimated Payout": { number: r.estimatedPayout },
      "Total Cards": { number: r.totalCards },
      "Quantities (JSON)": {
        rich_text: [
          { type: "text", text: { content: JSON.stringify(r.quantities) } },
        ],
      },
      "Has Edge Items": { checkbox: r.hasEdgeItems },
      "Edge Items Notes": {
        rich_text: r.edgeItemsNotes
          ? [{ type: "text", text: { content: r.edgeItemsNotes } }]
          : [],
      },
      "Notes from Submitter": {
        rich_text: r.notes
          ? [{ type: "text", text: { content: r.notes } }]
          : [],
      },
      "Submitted At": { date: { start: isoDate(r.submittedAt) } },
      "Last Customer Contact": { date: { start: isoDate(r.submittedAt) } },
      "Follow-Ups Sent": { multi_select: [] },
      "Pause Follow-Ups": { checkbox: false },
      "Inquiry ID": {
        rich_text: [{ type: "text", text: { content: r.inquiryId } }],
      },
    },
  });

  return {
    pageId: page.id,
    url: "url" in page && typeof page.url === "string" ? page.url : "",
  };
}

export type CandidateRow = {
  pageId: string;
  inquiryId: string;
  name: string;
  email: string;
  cardsOffer: number;
  shipReimbursement: number;
  estimatedPayout: number;
  totalCards: number;
  method: "ship" | "meetup";
  status: InquiryStatus;
  lastCustomerContact: Date;
  followUpsSent: FollowUpStage[];
};

export async function queryShipCandidates(): Promise<CandidateRow[]> {
  const res = await client().databases.query({
    database_id: dbId(),
    filter: {
      and: [
        { property: "Status", select: { equals: "Offered — Ship" } },
        { property: "Pause Follow-Ups", checkbox: { equals: false } },
      ],
    },
    page_size: 100,
  });

  return res.results
    .filter((p): p is typeof p & { properties: Record<string, unknown> } =>
      "properties" in p
    )
    .map((page) => {
      const props = (page as { properties: Record<string, any> }).properties;

      const readText = (p: any): string =>
        p?.rich_text?.[0]?.plain_text ?? p?.title?.[0]?.plain_text ?? "";
      const readDate = (p: any): Date =>
        p?.date?.start ? new Date(p.date.start) : new Date(0);
      const readMulti = (p: any): string[] =>
        (p?.multi_select ?? []).map((o: { name: string }) => o.name);
      const readNum = (p: any): number => p?.number ?? 0;
      const readSelect = (p: any): string => p?.select?.name ?? "";
      const readStatus = (p: any): string => p?.select?.name ?? p?.status?.name ?? "";

      const method = readSelect(props["Method"]).toLowerCase();

      return {
        pageId: (page as { id: string }).id,
        inquiryId: readText(props["Inquiry ID"]),
        name: readText(props["Name"]),
        email: props["Submitter Email"]?.email ?? "",
        cardsOffer: readNum(props["Offer Amount"]),
        shipReimbursement: readNum(props["Ship Reimbursement"]),
        estimatedPayout: readNum(props["Estimated Payout"]),
        totalCards: readNum(props["Total Cards"]),
        method: method === "meetup" ? "meetup" : "ship",
        status: readStatus(props["Status"]) as InquiryStatus,
        lastCustomerContact: readDate(props["Last Customer Contact"]),
        followUpsSent: readMulti(props["Follow-Ups Sent"]) as FollowUpStage[],
      };
    });
}

export async function recordFollowUpSent(
  pageId: string,
  stage: FollowUpStage,
  priorStages: FollowUpStage[]
): Promise<void> {
  const next = Array.from(new Set([...priorStages, stage]));
  await client().pages.update({
    page_id: pageId,
    properties: {
      "Follow-Ups Sent": {
        multi_select: next.map((name) => ({ name })),
      },
    },
  });
}

export async function setStatus(
  pageId: string,
  status: InquiryStatus
): Promise<void> {
  await client().pages.update({
    page_id: pageId,
    properties: {
      Status: { select: { name: status } },
    },
  });
}
