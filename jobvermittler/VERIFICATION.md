# Verification record

Prepared 24 October 2026. Jobvermittler is source code plus a private owner setup, not an activated hosted service.

| Boundary | Result |
|---|---|
| TypeScript checks | Passed |
| Employment and access-control tests | 14 passed |
| Production compilation | Passed with explicit just-bash sandbox; no Docker required |
| Real model/search turn | Not tested: no model credential supplied |
| Automatic employer contact/submission | Not implemented; no such tools exposed |
| Phone-accessible hosting | Not provisioned |

The tests cover missing/unknown mandatory requirements, source freshness, expired deadlines, evidence IDs, duplicate preservation, draft/submission distinction, profile invalidation, exclusions, transactional persistence, access tokens, foreign origins and Berlin dates. They do not establish semantic matching accuracy or a probability of hiring.

The dashboard supports private records and reports; a running production eve process and model credential are required for scheduled AI research. Dashboard HTTP integration passed: private profile write/read, vacancy creation, owner confirmation, metrics, export, missing-token rejection (401), foreign-origin rejection (403), and unavailable-agent error handling. Production runtime smoke check passed: health 200, unauthenticated info 401, authenticated info 200. Browser visual verification was not completed: Chromium was unavailable and its download failed. Review a live research result against the employer source before relying on ranking.

## Hosting preparation, 24 October 2026

Added a supervised production launcher, persistent workflow-volume linking, a combined readiness endpoint and a Render Blueprint proposal. Two additional tests verify preservation across releases and refusal to overwrite existing workflow data. TypeScript checks and all 14 tests passed. Hosted deployment and live model/search verification remain pending account connection and a defined spending limit. Daily schedules are disabled in the hosting proposal until live verification.

The combined production launcher was exercised without a live model request: agent startup and dashboard readiness passed, combined health returned 200, private records returned 401 without credentials and 200 with the test owner token. The Render proposal passed both YAML syntax checks and validation against Render’s published JSON Schema. Platform-aware service validation and an actual hosted deploy remain pending.
