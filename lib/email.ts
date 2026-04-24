import { Resend } from "resend";

const FROM = "Vincent <info@unpackhits.com>";

let _resend: Resend | null = null;
function client(): Resend {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not set");
  _resend = new Resend(key);
  return _resend;
}

export type SendArgs = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};

export async function sendEmail(args: SendArgs): Promise<{ id: string }> {
  const res = await client().emails.send({
    from: FROM,
    to: args.to,
    subject: args.subject,
    text: args.text,
    replyTo: args.replyTo,
  });
  if (res.error) {
    throw new Error(`Resend error: ${res.error.message}`);
  }
  return { id: res.data?.id ?? "" };
}
