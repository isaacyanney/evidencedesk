# Verification record

Prepared 24 October 2026. Jobvermittler is source code plus a private owner setup, not an activated hosted service.

| Boundary | Result |
|---|---|
| TypeScript checks | Passed |
| Employment and access-control tests | 12 passed |
| Production compilation | Passed with explicit just-bash sandbox; no Docker required |
| Real model/search turn | Not tested: no model credential supplied |
| Automatic employer contact/submission | Not implemented; no such tools exposed |
| Phone-accessible hosting | Not provisioned |

The tests cover missing/unknown mandatory requirements, source freshness, expired deadlines, evidence IDs, duplicate preservation, draft/submission distinction, profile invalidation, exclusions, transactional persistence, access tokens, foreign origins and Berlin dates. They do not establish semantic matching accuracy or a probability of hiring.

The dashboard supports private records and reports; a running production eve process and model credential are required for scheduled AI research. Dashboard HTTP integration passed: private profile write/read, vacancy creation, owner confirmation, metrics, export, missing-token rejection (401), foreign-origin rejection (403), and unavailable-agent error handling. Production runtime smoke check passed: health 200, unauthenticated info 401, authenticated info 200. Browser visual verification was not completed: Chromium was unavailable and its download failed. Review a live research result against the employer source before relying on ranking.
