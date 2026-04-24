# Unpack Hits — Setup Runbook

Step-by-step for the parts that need your login (Vercel, Resend, GitHub, DNS). The code is already written and committed; this is just provisioning.

Expected total time: **45-75 minutes**, most of it waiting on DNS propagation.

---

## What's already done

- ✅ `git init` + initial commit (local only, not pushed)
- ✅ `npm install` — dependencies in `node_modules/`
- ✅ TypeScript typecheck passes
- ✅ Notion database **Bulk Inquiries** created under _Unpack Hits Content System_
  - **Database URL**: <https://www.notion.so/599b01a1d61b4b4cad18d8e782f72b98>
  - **Database ID**: `599b01a1d61b4b4cad18d8e782f72b98` (you'll need this in env vars)

---

## 1. Create GitHub repo + push

Create an empty repo on GitHub named `unpackhits-website` (or whatever you like), private or public.

Then from this directory:

```bash
git remote add origin https://github.com/<your-username>/unpackhits-website.git
git branch -M main
git push -u origin main
```

---

## 2. Resend (transactional email)

**Time: 10 min of clicks + up to 60 min of DNS propagation.**

1. Sign up at <https://resend.com> (free tier covers your expected volume).
2. Go to **Domains** → **Add Domain** → enter `unpackhits.com`.
3. Resend shows 3-4 DNS records (DKIM, SPF, return-path, DMARC). **Add them to your DNS provider** (wherever `unpackhits.com` is registered — probably the same place Netlify points to now).
4. Wait for Resend's verification indicator to turn green. Usually 10-30 min; can take up to an hour.
5. Go to **API Keys** → **Create API Key** → name it `unpackhits-prod` → scope: Full access → **copy the key** (starts with `re_`). You'll paste it into Vercel later.

**Note on sender identity:** The code sends from `Vincent <info@unpackhits.com>`. Once DKIM verifies the domain, any address at `@unpackhits.com` works as sender — you don't need a separate per-address setup.

---

## 3. Notion integration token

**Time: 3 min.**

1. Go to <https://www.notion.so/my-integrations>.
2. Click **New integration**.
   - Name: `Unpack Hits Pipeline`
   - Associated workspace: pick the one that contains the Bulk Inquiries DB
   - Type: Internal
3. Capabilities: Read content, Update content, Insert content.
4. Click **Submit** → copy the **Internal Integration Secret** (starts with `ntn_` or `secret_`). Save it for Vercel env.
5. Open the Notion database <https://www.notion.so/599b01a1d61b4b4cad18d8e782f72b98> → click the `•••` menu (top right) → **Connections** → **Add connections** → search for `Unpack Hits Pipeline` → add it.

---

## 4. Vercel project

**Time: 10 min.**

1. Sign up / log in at <https://vercel.com>.
2. **Add New** → **Project** → import the GitHub repo you just pushed.
3. Framework preset: **Other** (it's a static site + serverless functions).
4. Root directory: leave as `./`
5. Build command: leave default / empty.
6. Output directory: leave empty.
7. **Environment Variables** — add these (Production + Preview + Development):

   | Name | Value |
   |---|---|
   | `NOTION_TOKEN` | The secret from step 3.4 |
   | `NOTION_DATABASE_ID` | `599b01a1d61b4b4cad18d8e782f72b98` |
   | `RESEND_API_KEY` | The `re_...` key from step 2.5 |
   | `OPS_EMAIL` | `info@unpackhits.com` |
   | `CRON_SECRET` | Generate a random 32-char string — use `openssl rand -hex 32` in your terminal |

8. **Deploy**. First deploy will give you a preview URL like `unpackhits-website-xxxx.vercel.app`.

---

## 5. Verify on the preview URL (before DNS cutover)

**Don't touch DNS yet.** Test everything against Vercel's preview URL first.

### Test the form end-to-end

1. Open the preview URL → scroll to the form.
2. Fill it out with **your own real email** (so you can see what customers get).
3. Enter enough cards to pass $20 minimum (e.g. 4,000 Commons & Uncommons = $52).
4. Submit.

Verify within 1 minute:
- ✅ Success state appears with correct payout.
- ✅ A row appears in <https://www.notion.so/599b01a1d61b4b4cad18d8e782f72b98> with Status `Offered — Ship`, all fields populated.
- ✅ Auto-reply lands in the email you entered (from `info@unpackhits.com`). Check spam / Promotions if not in inbox.
- ✅ Vincent notify lands in `info@unpackhits.com` (same inbox in this case since it's you testing). Subject includes the dollar amount + Inquiry ID.

### Test the cron

From your terminal (fill in `<preview-url>` and `<cron-secret>`):

```bash
# Create a test row manually in Notion:
# - Status = "Offered — Ship"
# - Submitter Email = your test email
# - Last Customer Contact = 25 hours ago (click the date picker, pick yesterday)
# - Follow-Ups Sent = (empty)

curl -i "https://<preview-url>.vercel.app/api/follow-up-cron" \
  -H "Authorization: Bearer <cron-secret>"
```

Expected:
- ✅ Returns `{"ok":true, "evaluated":1, "sent":[{...,"stage":"24h"}], ...}`.
- ✅ 24h follow-up email arrives at your test inbox.
- ✅ The Notion row now has `24h` in Follow-Ups Sent.

Rerun the same curl without changing anything → `sent: []`. That's idempotency working.

To test 72h and 7d, edit the row's `Last Customer Contact` to further back and re-run curl.

### Test invalid submissions

From your browser's DevTools console on the preview URL:

```js
fetch('/api/inquiry', {
  method: 'POST',
  headers: {'Content-Type':'application/json'},
  body: JSON.stringify({
    name: 'Test', email: 't@t.com', location: 'Test, CA',
    method: 'ship',
    quantities: { commons_uncommons: 500 },  // = $6.50 offer, below $20
    hasEdgeItems: false,
    confirmedEnglishNM: true
  })
}).then(r => r.json()).then(console.log);
```

Expected: `{ error: "below_minimum", min: 20, offer: 6.5 }` with HTTP 400.

---

## 6. DNS cutover — Netlify → Vercel

Only do this once all the verification above passes.

1. In Vercel: **Settings** → **Domains** → add `unpackhits.com` and `www.unpackhits.com`.
2. Vercel shows you the DNS records to add (A record for apex, CNAME for www).
3. In your DNS provider, update those records.
4. Wait 5-15 min for propagation.
5. Visit `https://unpackhits.com` — confirm it's serving the new page (check the network tab for the `x-vercel-id` response header).

**Leave the Netlify site + Formspree endpoint `mykbdodj` alive for 14 days** as a rollback. If anything breaks in week 1, flip DNS back to Netlify. Set a calendar reminder: on day 14, archive Formspree and delete the Netlify deploy.

---

## 7. Ongoing operations

Once live, you interact with the system by:

- **Checking Notion** — new inquiries land in the `Bulk Inquiries` database. Review the `Has Edge Items` rows (graded/sealed cards — not auto-offered).
- **Replying to tracking emails** — when a seller emails back with tracking + PayPal, update their Notion row: set Status=Shipped, paste Tracking # and PayPal Email. Bump `Last Customer Contact` to today so the cron pauses the old follow-up clock.
- **When the package arrives** — inspect, then set Status=Received. Pay via PayPal. Set Status=Paid → then Won.
- **Pausing automation** for a specific row — check the `Pause Follow-Ups` box. Cron will skip it.

### Recommended Notion views to set up (one time, 5 min in the Notion UI)

- **Needs My Action** — filter Status ∈ (Shipped, Received, Has Edge Items, Offered — Meetup)
- **Automation Running** — filter Status = Offered — Ship, sort by Last Customer Contact ascending
- **Won This Month** — filter Status = Won, Submitted At = this month (for tracking your conversion rate)

---

## Rollback

If you need to revert to the old Formspree flow mid-migration:

```bash
git revert HEAD         # reverts the initial pipeline commit on a clean branch
git push                # Vercel redeploys to the old version
```

Or faster: in your DNS provider, flip the A/CNAME records back to Netlify's addresses. Netlify still serves the old Formspree version.

---

## Questions during setup?

The plan with full architecture + verification is at `~/.claude/plans/i-m-thinking-of-improving-scalable-sphinx.md`. The per-file reference:

- [lib/rates.ts](lib/rates.ts) — all pricing constants (rates, $20 min, $28/box reimbursement, 4,500-card threshold, 7-day validity)
- [api/inquiry.ts](api/inquiry.ts) — form submission pipeline
- [api/follow-up-cron.ts](api/follow-up-cron.ts) — scheduled follow-ups
- [lib/templates/](lib/templates) — 6 email templates
