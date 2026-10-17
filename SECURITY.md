# Security boundaries

This project is a single-instance demonstration, not an enterprise authentication or incident-response product.

Production startup requires a shared API key. All protected routes use constant-time key comparison. Anyone holding the key can read corpus metadata, traces and aggregate statistics, and submit queries or feedback. There is no user, document or tenant isolation. Use only sources appropriate for that shared audience.

Requests are limited to 16 KiB actual body bytes and 2,000 question characters. Rate limiting and concurrency caps are local to one process. The process does not trust forwarded headers by default. Health endpoints and static assets are public; readiness exposes backend type, chunk count and snapshot hash. Put a public service behind HTTPS, identity access control and proxy limits.

The browser renders model and source text with `textContent`, not HTML. It uses a restrictive CSP, has no third-party scripts and keeps the API key in memory only. Input questions are sent to the configured Ollama service only when model drafting is enabled and evidence clears the gate. Raw questions/answers are not written to the SQLite audit log, but hashes can still identify guessable questions. Protect backups and configure retention.

Runbook content and user questions are untrusted data in the drafting prompt. Citation IDs are allowlisted against supplied evidence. A simple regex blocks a few obvious injection forms; it is not a comprehensive defense. An attacker can still influence generated text or induce bad source selection. No generated output executes tools, modifies accounts or changes endpoints.

Report a suspected issue privately to the repository maintainer using a private channel available on their profile. Do not attach credentials or real employer records to public issues.
