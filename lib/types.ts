import type { Quantities } from "./rates.js";

export type Method = "ship" | "meetup";

export type InquirySubmission = {
  name: string;
  email: string;
  location: string;
  method: Method;
  quantities: Quantities;
  hasEdgeItems: boolean;
  edgeItemsNotes?: string;
  notes?: string;
};

export type InquiryStatus =
  | "Offered — Ship"
  | "Offered — Meetup"
  | "Has Edge Items"
  | "Shipped"
  | "Received"
  | "Paid"
  | "Won"
  | "Lost-Silent"
  | "Lost-Declined";

export type FollowUpStage = "24h" | "72h" | "7d";

export type InquiryRecord = InquirySubmission & {
  inquiryId: string;
  cardsOffer: number;
  shipReimbursement: number;
  estimatedPayout: number;
  totalCards: number;
  status: InquiryStatus;
  submittedAt: Date;
  breakdown: Array<{ label: string; qty: number; subtotal: number }>;
};
