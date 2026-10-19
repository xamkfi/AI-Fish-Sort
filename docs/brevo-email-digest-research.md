# Brevo Email Digest — Research & Implementation Suggestions

Date: 2026-09-14
Status: Research / proposal (no code changes yet)

## 1. Goal

Send a periodic (weekly) synopsis of the dashboard's fish-sorting data to the client by email, using **Brevo** as the sending provider. The solution must:

- Run in the production **Windows deployment** (app runs in Docker, started with `rebuild-docker.bat` / `deploy.bat`).
- Be developable and testable on a **Bazzite** (immutable Fedora Linux) dev machine without sending real client emails.
- Be as **simple as possible** — this is a low-volume, single-recipient notification, not a marketing campaign.

## 2. Current project context (what we already have)

| Component | Notes |
|---|---|
| Stack | Node.js + Express (CommonJS), Sequelize + MySQL, HBS views, dotenv |
| Stats data | `controllers/api/fishStatsController.js` already exposes `count`, `summary`, `timeline`, `distribution`, `comparison` under `/api/v1/fish-stats` — the digest can reuse the same aggregation logic or call it internally |
| Email scaffold | `lib/digest/` and `views/emails/` exist (empty) and `digest-preview.html` is a finished-looking **inline-styled HTML template** ("Fish AI – katsaus", Finnish, weekly KPI cards) — the design work is already largely done |
| Deployment | Docker on Windows host; MySQL in its own container; dev can also run `npm start` natively (works on Bazzite too) |

So the remaining work is: (a) pick a Brevo integration method, (b) render the digest HTML from DB data, (c) schedule it.

## 3. Brevo — account setup prerequisites (any option)

1. Create a Brevo account (free plan is enough — it includes transactional email with a daily sending quota, historically **300 emails/day**; verify current limits on their pricing page).
2. **Register and verify a sender** (`From` name + email). Brevo will not send from an unverified sender. If you own a domain, add it + DKIM/SPF records for best deliverability; for the prototype a verified single mailbox address works.
3. Generate credentials:
   - **API key** (`xkeysib-...`) for the HTTP API — under *SMTP & API → API keys*.
   - **SMTP key** (separate from the API key!) if using the SMTP relay — under *SMTP & API → SMTP tab*.
4. Optional: IP whitelisting exists but is **not required for server-to-server API calls** (only for their browser playground).

## 4. Implementation options compared

### Option A — Brevo HTTP API v3 via plain `fetch` (RECOMMENDED)

Send `POST https://api.brevo.com/v3/smtp/email` with header `api-key: <key>` and a JSON body:

```json
{
  "sender": { "name": "Fish AI", "email": "noreply@yourdomain.fi" },
  "to": [{ "email": "client@example.com", "name": "Asiakas" }],
  "subject": "Fish AI – viikkokatsaus",
  "htmlContent": "<html>…rendered digest…</html>"
}
```

Response `201 { "messageId": "..." }`.

**Pros**
- **Zero new npm dependencies** — Node 18+ has global `fetch` (the app's Node version supports it; verify in the Docker base image).
- HTTPS only → no SMTP port problems. Ports 25/587/465 are frequently blocked by residential ISPs, corporate networks, and some hosting firewalls — the HTTP API sidesteps all of that. Important for a Windows deployment on an unknown network.
- Clear JSON error responses (easier to debug than SMTP dialogs).
- Rate limits are far beyond our needs (1,000 req/s on `POST /v3/smtp/email` on the general tier).
- Same behavior inside Docker-on-Windows and on Bazzite.

**Cons**
- We hand-roll the HTML ourselves (fine — `digest-preview.html` already exists and HBS can render it as a partial).

### Option B — Brevo SMTP relay + `nodemailer`

Brevo gives per-account SMTP credentials: host `smtp-relay.brevo.com`, ports **587 / 2525** (STARTTLS) or **465** (SSL/TLS). Use with the ubiquitous `nodemailer` package:

```js
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  auth: { user: process.env.BREVO_SMTP_LOGIN, pass: process.env.BREVO_SMTP_KEY }
});
```

**Pros**
- Industry-standard; `nodemailer` gives MIME handling, attachments, and a built-in **`jsonTransport` / dry-run mode** that is handy for dev testing.
- SMTP credentials can be swapped for a local dev SMTP server easily.

**Cons**
- One extra dependency; SMTP handshake can be slow/hang in containers.
- **Port 587/2525/465 outbound may be blocked** on the client's Windows network — a real operational risk we can't verify in advance. This is the main reason to prefer the API.
- SMTP relay does not support batch sending (irrelevant to us, but shows the API is the first-class citizen).

### Option C — Official SDK (`@getbrevo/brevo`, previously `sib-api-v3-sdk`)

Typed client wrapping the same endpoints (`client.transactionalEmails.sendTransacEmail(...)`).

**Pros** — typed models, SDK maintained by Brevo.
**Cons** — extra dependency and it has churned historically (the old `sib-api-v3-sdk` was deprecated/replaced); for a single endpoint call the SDK adds nothing meaningful. Skip.

### Option D — Brevo-hosted template (`templateId` + `params`)

Design the digest once in Brevo's editor, then send with `templateId` and a `params` object (`{{ params.HAVAINTOJA }}` etc.). No HTML in the repo at all.

**Pros** — non-developer can tweak the design in the Brevo dashboard; tiniest code.
**Cons**
- Template and variables live **outside git** → dev/prod drift, no code review of email content.
- We'd duplicate the work already done in `digest-preview.html`, and HBS helpers (e.g. conditional rows for empty weeks) are limited in Brevo's template language.
- Harder to preview locally on Bazzite.

### Summary

| Option | Deps | Port risk | Preview/test locally | Fits repo | Verdict |
|---|---|---|---|---|---|
| A: HTTP API + fetch | 0 | none | yes (HBS → string, log or send to self) | yes | **Recommended** |
| B: SMTP + nodemailer | 1 | real (587/465) | excellent (jsonTransport) | yes | Good fallback |
| C: SDK | 1+ | none | yes | meh | Skip |
| D: Brevo template | 0 | none | limited | no | Skip for now |

## 5. Scheduling the digest

The client's Windows host runs the app in Docker. Options:

1. **In-process scheduler (`node-cron`)** — RECOMMENDED. One tiny dependency; start the cron in `bin/www` (or `app.js`) after DB init. `cron.schedule('0 8 * * 1', …)` = every Monday 08:00. Runs identically in Docker-on-Windows and on Bazzite — **no host OS configuration needed**, survives `rebuild-docker` because it's part of the app.
   - Caveat: fires only while the app is running (which is exactly how the dashboard is used), and uses the container's timezone — set `TZ=Europe/Helsinki` in the Dockerfile/compose.
2. **Windows Task Scheduler / cron hitting an endpoint** — e.g. `POST /admin/digest/send` with an API key. More moving parts outside the repo, needs the host machine awake; skip unless we later want OS-level control.
3. **Brevo `scheduledAt`** — only schedules a *single* future send (beta), not recurring. Not a scheduler.

## 6. Dev & test workflow on Bazzite (vs Windows deployment)

Because the app is plain Node + Docker, development on Bazzite is already supported (`StartDatabase` equivalent: `docker/podman compose -f MySQL/… up`, then `npm start`). For the email piece specifically:

- **Dry-run mode**: gate all sending behind `DIGEST_DRY_RUN=1` — build the HTML but don't call Brevo; write it to `digest-preview.html` (already the existing pattern) or log it. This requires zero Brevo infrastructure to iterate on layout/data.
- **Self-send mode**: with a real Brevo key, send digests **only to your own verified sender address** (`DIGEST_RECIPIENTS=you@example.com` in `.env`) — never the client's address in dev.
- **Separate Brevo dev account or separate API key** so dev sends are easy to audit in the Brevo logs; Brevo's transactional email log (`app.brevo.com → Transactional → Logs`) shows every send, which is your test assertion.
- Docker parity: the same env vars go into `Dockerfile`/`deploy.bat` for Windows (`-e BREVO_API_KEY=... TZ=Europe/Helsinki`); nothing in the code differs between platforms.
- One-time manual test from the terminal to validate the key + sender before writing code:
  ```bash
  curl -s https://api.brevo.com/v3/smtp/email \
    -H "api-key: $BREVO_API_KEY" -H "content-type: application/json" \
    -d '{"sender":{"email":"you@example.com"},"to":[{"email":"you@example.com"}],
         "subject":"Brevo smoke test","textContent":"hello"}'
  ```

## 7. Suggested shape of the implementation (Option A + node-cron)

```
lib/digest/
  index.js          # exports sendDigest() and starts the cron when enabled
  collectDigestData.js  # reuse the fish-stats aggregation helpers
  renderDigest.js   # HBS partial views/emails/digest.hbs → html string
views/emails/
  digest.hbs        # port of digest-preview.html (inline styles)
```

New env vars (extend `.env.example`):

```
BREVO_API_KEY=
BREVO_SENDER_EMAIL=noreply@example.fi
BREVO_SENDER_NAME=Fish AI
DIGEST_RECIPIENTS=client@example.com
DIGEST_CRON=0 8 * * 1
DIGEST_ENABLED=0            # 1 enables the weekly schedule
DIGEST_DRY_RUN=1            # 1 = render only, don't call Brevo
```

Sketch of the send call (no new deps):

```js
async function sendDigest({ subject, html }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
      'accept': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: process.env.BREVO_SENDER_NAME, email: process.env.BREVO_SENDER_EMAIL },
      to: process.env.DIGEST_RECIPIENTS.split(',').map(e => ({ email: e.trim() })),
      subject,
      htmlContent: html
    })
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
  return res.json(); // { messageId }
}
```

Rollout order (simplest first):
1. Render `digest.hbs` with real data → dry-run to `digest-preview.html` (test on Bazzite).
2. Manual send to self via a `POST /admin/digest/send` button (protected by existing login middleware) — validates sender + key.
3. Add `node-cron` + `DIGEST_*` env config; document in README for the Windows deployment.

## 8. Sources

- Brevo — Send a transactional email (endpoint `POST /v3/smtp/email`, htmlContent/textContent/templateId, sender verification, webhooks): https://developers.brevo.com/docs/send-a-transactional-email
- Brevo — SMTP relay integration (hosts, ports 587/2525/465, SMTP key ≠ API key, relay limitations): https://developers.brevo.com/docs/smtp-integration
- Brevo — Quickstart (API key, IP whitelisting not needed for server calls): https://developers.brevo.com/docs/quickstart
- Brevo — API rate limits (1,000 RPS on send endpoint on general tier): https://developers.brevo.com/docs/api-limits
- Brevo — Free plan daily email quota (verify current value): https://www.brevo.com/pricing/
