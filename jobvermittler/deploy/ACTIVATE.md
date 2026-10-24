# Private activation proposal

Source: `isaacyanney/evidencedesk`, branch `jobvermittler`, app directory `jobvermittler`.

## Proposed service

Use the Blueprint at `jobvermittler/deploy/render.yaml` to create one Node web service in Frankfurt, one instance, with a 1 GB persistent disk. The launcher starts eve on a private loopback port, waits for readiness, and starts the authenticated dashboard on the hosting port. The public host supplies HTTPS. The disk holds both application records and durable workflow state across releases. Do not enable replicas against this local storage design.

This proposal selects the smallest paid web-service instance (0.5 vCPU / 512 MB). Its capacity must be checked on the first real agent turn; no automatic paid upgrade is configured. Render lists the corresponding Starter compute at USD 7/month. Its pricing lists persistent disks separately at USD 0.25/GB-month. Confirm the current checkout price, workspace fees, bandwidth and taxes before creating the service. AI usage is additional. A USD 5/month dedicated model-key budget is a conservative initial proposal, not an already-configured limit or a promise of sufficient usage.

References checked 24 October 2026:
- https://render.com/articles/render-vs-railway
- https://render.com/pricing
- https://render.com/docs/disks
- https://render.com/docs/blueprint-spec
- https://vercel.com/docs/ai-gateway/observability-and-spend/budgets

## Account steps required

1. Connect Render to ChatGPT and authorize access to the relevant GitHub repository. Connection does not itself approve a subscription.
2. Agree the monthly running budget before confirming paid hosting or buying AI credits.
3. Create a dedicated AI Gateway key in the owner's Vercel account and configure its agreed monthly budget. Keep automatic top-up disabled unless separately authorized. Set alerts where available. Vendor budgets are soft caps: the crossing request may finish; account for that in the allowance. Search and model usage must be checked against actual metering.
4. Enter `AI_GATEWAY_API_KEY` through Render's secure secret settings. Do not paste credentials in chat or GitHub. The Blueprint prompts for this secret and generates `JOBVERMITTLER_TOKEN` automatically. Store the owner token privately for dashboard login; do not put it in the URL.
5. Confirm and create the reviewed hosting service. Automatic code deployments are off. Schedules are initially disabled.

The connected Vercel integration allowed team/project discovery but returned HTTP 403 for integration configuration discovery. The CLI fallback had no separate saved credentials. That access does not establish AI Gateway credit balance, a usable API key, or permission to configure budgets.

## First-use verification

- Confirm the hosted `/healthz` endpoint is healthy and private records reject missing/incorrect tokens.
- Sign in to the HTTPS dashboard, then import the private owner profile from `Isaac_Jobvermittler_Private_Setup.zip`. The profile is intentionally absent from the public repository.
- Check the gateway credential and credit balance with `npm run check-access` in the private service environment. This check does not make a billable model call. Verify the actual key budget and auto-top-up setting in the account.
- Make one short real agent turn. Confirm model response, tool use, database writes and reported usage. Then check one researched job against the actual employer page and confirm a draft uses only real profile evidence.
- Inspect memory use, service errors and any model/search charges. A compiled app alone does not establish that 512 MB is adequate for live workloads.
- Confirm start date and remaining factual conflicts, then load/reconcile prior application confirmations before proposing resubmissions.
- After live verification, enable the scheduled research by setting `EVE_SCHEDULES_DISABLED=0` and restarting the service. The authored schedule is 06:00 UTC on weekdays (07:00 or 08:00 in Berlin depending on daylight saving). It writes dashboard briefs, not email notifications.
- Test a service restart and confirm the same profile and job records are retained. Back up the disk and private exports.

## Local combined launcher

After `npm ci`, configuration and `npm run build`, run `npm run serve` to start both processes. Local default binding is loopback. The launcher requires a model credential, refuses to overwrite existing workflow storage and exits when either child service fails. It forwards shutdown signals to both processes.

If a service is not connected or no budget has been agreed, stop before provisioning paid resources. The source and deployment configuration are prepared for review; no hosted URL or active daily research is claimed.
