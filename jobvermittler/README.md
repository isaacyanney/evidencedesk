# Jobvermittler

A private employment assistant focused on a fast, realistic route into suitable paid work. It researches vacancies, compares requirements with sourced career facts, prepares application drafts, and keeps a clear record of what actually happened. Its instructions emphasize supportive, honest advocacy and useful next actions.

This directory is a standalone Node 24 application. It lives on the `jobvermittler` branch of the repository; the existing EvidenceDesk application remains intact. The source code is public. Personal profile, credentials, CV facts, drafts and application records belong only in the private runtime database, never in GitHub.

## What is implemented

- An eve tool-using agent with web search and safe web fetching.
- A responsive private dashboard: chat, daily plan, vacancies, drafts, profile editor, progress metrics and private backup export.
- Persistent SQLite records shared across chats and scheduled runs; source evidence and profile evidence IDs.
- Suitability ranking with explicit mandatory-criterion blockers, unknowns, deadlines, 72-hour source checks, location/hours fit and employer exclusions. Scores are internal sorting aids, not hiring probabilities.
- Canonical URL deduplication and similar-role warnings. Refreshing a job preserves confirmed application status and follow-up dates.
- Drafts for cover letters, CV changes, follow-ups, recruiter messages and interviews.
- Owner-recorded submission/employer updates with evidence and follow-up dates. The agent has no sending, submission, signature or offer-acceptance tools.
- A weekday morning research schedule at 06:00 UTC (08:00 Berlin in summer, 07:00 in winter). It writes reports in the dashboard; it does not send notifications. The schedule runs only while the production eve process is running.
- Access token authentication, loopback-only listeners, no browser persistence of the token, parameterized database queries, restricted file serving and a conservative browser content-security policy.

## Private online deployment

A prepared Render deployment is in [deploy/render.yaml](deploy/render.yaml), with activation steps and cost assumptions in [deploy/ACTIVATE.md](deploy/ACTIVATE.md). It runs the dashboard and agent together, stores records and workflow data on one persistent disk, and keeps schedules disabled until the first live turn is verified. No paid service has been created.

## Start locally

You need Node.js 24, npm, and an AI Gateway credential for AI conversations and web search. API usage and search may incur charges; the model-token limit below is not a total spending cap.

```bash
git clone --branch jobvermittler https://github.com/isaacyanney/evidencedesk.git
cd evidencedesk/jobvermittler
npm ci
npm run setup
```

Edit `.env`: set `AI_GATEWAY_API_KEY` and retain the generated `JOBVERMITTLER_TOKEN`. Never paste either into GitHub or a public chat. You can obtain a Gateway key from your own Vercel AI Gateway account. Your ChatGPT subscription does not automatically supply this project's deployed API credentials.

Import your private profile (provided separately for the owner), or edit the supplied example locally:

```bash
npm run import-profile -- /absolute/path/to/profile.private.json
```

Alternatively, use the **Your profile** tab. Every evidence item has a stable ID, a fact and a source. Profile changes invalidate prior fit assessments. Drafts still need factual review after profile changes.

Run the runtime in one terminal:

```bash
# eve loads the .env file; the explicit host keeps the agent local.
npm run dev -- --no-ui --host 127.0.0.1 --port 2000
```

Run the dashboard in another:

```bash
npm run dashboard
```

Open `http://127.0.0.1:3000`, enter `JOBVERMITTLER_TOKEN` from `.env`, then click **Find my strongest opportunities**. If the model key or runtime is missing, the task shows a failure instead of pretending research occurred. The dashboard, profile and records work without a model key.

The dashboard reuses your conversation. Type a message and choose **Start fresh chat** after a session expires or reaches its usage limit; your employment records remain. The model-token threshold is 120,000 uncached input tokens, 16,000 output tokens or USD 2 of reported model usage per continuation window. A call may cross the threshold; tool/search and hosting charges are additional. Configure a provider-level budget for a financial cap. Unattended daily runs cannot approve usage continuation.

## Use it as your employment partner

1. Confirm your private profile, availability and work preferences. Mark uncertain facts explicitly.
2. Import or record known applications before research so the ledger can help avoid duplicates. History is incomplete until you populate it.
3. Ask for a focused shortlist. Review the official vacancy, blockers, hours, pay and start date.
4. Review application drafts, attachments and any CV changes before using them.
5. After you actually apply or receive an employer message, use **Record an employer update** under that vacancy. Save the real reference and next follow-up date.
6. Ask for interview practice, a follow-up draft, or a short daily plan.

Useful requests:

> Find realistic full-time roles in Berlin where my documented experience meets the entry requirements. Prioritize an early paid start. Explain gaps before drafting applications.

> Prepare a tailored German cover letter and CV changes for the strongest verified match. Use my evidence and flag any missing fact.

> I feel overwhelmed. Read my pending applications and give me one useful action I can complete today.

## Run continuously on your own server

```bash
npm run check
npm run build
npm start -- --host 127.0.0.1 --port 2000
# In a second supervised process, with the same environment/data path:
npm run dashboard
```

Keep both processes running with a process manager and back up `data/` plus `.eve/` (the local durable workflow state). Set `JOBVERMITTLER_DATA_DIR` to an absolute persistent directory for both processes. Do not put the SQLite directory on ephemeral serverless storage or run replicas against separate local disks. This implementation is designed for one owner on one persistent Node host, not a multitenant cloud service.

For access from a phone, deploy on a persistent host behind HTTPS and an authenticated reverse proxy, preserving `/eve/` and `/.well-known/workflow/` callbacks when exposing eve. Keep tokens server-side where possible and rotate the owner token if disclosed. Do not expose the development server directly. No hosted deployment or paid resource is provisioned by this source package.

The data directory is protected by filesystem permissions, but it is not application-level encrypted. Protect the host and backups. Profile and job facts used in a conversation are processed by the configured model/provider and stored in the local workflow history. Search terms and public vacancy URLs go to search/fetch providers. Review provider data handling before adding highly sensitive records.

## Data shapes

`agent/lib/schema.ts` is the authoritative Zod schema. A manually saved vacancy looks like:

```json
{
  "employer": "Example employer",
  "title": "Support assistant",
  "reference": "ROLE-123",
  "url": "https://example.org/careers/ROLE-123",
  "location": "Berlin",
  "hours": "Full time",
  "salary": null,
  "start": null,
  "deadline": null,
  "checkedAt": "2026-10-24T10:00:00.000Z",
  "officialSource": true,
  "requirements": [{"criterion":"Relevant support experience","mandatory":true,"excerpt":"Experience supporting adults required."}],
  "notes": "Example only. Replace with a live verified vacancy."
}
```

Do not set `officialSource: true` or a checked timestamp unless you actually verified that source. Model-extracted criteria and the relevance of evidence still need human review; schema validation does not prove semantic accuracy or guarantee employment.

## Development and verification

```bash
npm run typecheck
npm test
npm run build
```

See [VERIFICATION.md](VERIFICATION.md) for actual observed results and remaining activation checks. The agent behavior lives in `agent/instructions.md`, typed tools in `agent/tools/`, ranking/storage in `agent/lib/`, and the dashboard in `server/` and `web/`. There are no email or recruitment-portal integrations in this version.
