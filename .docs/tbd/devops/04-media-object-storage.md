# Idea 04 — Media service & object storage (replace base64) + post resilience

> Candidate direction. For audit, not yet approved.

## Title
A dedicated media-service backed by object storage (S3/MinIO) so attachments are uploaded as files and referenced by URL — plus resilience for the posts→connections call.

## Business / product purpose
Today image/video/document attachments are embedded as **base64 inside post content** (`.docs/frontend.md` §8, §11) — bloating the DB, React state, and localStorage. Real upload + object storage is how production handles media and is a strong storage/DevOps lesson. Bundling resilience for posts→connections fixes the one risky synchronous dependency.

## Why it fits
Directly removes a known scaling debt (base64) and a known reliability risk (no fallback on posts→connections, ADR-006). Both are concrete, high-value, and teach storage + resilience patterns.

## Frontend UX
- Same Photo/Video/Document buttons, but: pick file → show progress → upload to media-service → receive a URL → store the URL in the post (not base64).
- Posts render `<img>/<video>/<a>` from URLs (faster, cacheable). Saved posts store URLs (tiny), fixing localStorage quota pressure.

## Frontend design / components
- Update `RichTextEditor`/composer attach flow to call `api/media.js#upload(file)` (multipart, progress via `XMLHttpRequest`/fetch streams).
- `parsePostContent` keeps working but the media token holds a `url` instead of base64 `data`. `renderPostHtml`/saved render from URL.

## Backend service design
- New **media-service** (Go or Node): accepts authenticated multipart uploads, validates type/size, stores to **MinIO (local) / S3 (cloud)**, returns a URL (or pre-signed URL pattern). Optional: generate thumbnails.
- Alternatively, issue **pre-signed upload URLs** so the browser uploads directly to storage (less load on the service) — recommended at scale.
- Resilience: wrap posts-service → connections-service with **timeout + retry + circuit breaker** (Resilience4j) and a sane fallback (e.g. global feed if the graph is unavailable).

## Required APIs
- `POST /api/v1/media` (multipart) → `{ url, type, size }`, OR `POST /api/v1/media/presign` → `{ uploadUrl, fileUrl }`.
- `GET` media served by storage/CDN (not the service) where possible.

## DB / persistence changes
- media-service metadata table (owner, key, type, size, createdAt) in Postgres (`collabsphere_media`) — optional but useful for cleanup/quotas.
- Object storage bucket(s). Post content media token: `{type, url, name?, size?}` (no base64).

## Service-to-service communication
- UI → media-service (upload). posts-service stores URLs only. No new coupling; posts→connections gets resilience, not removal.

## Security
- AuthN on upload; validate MIME + magic bytes + size limits; strip EXIF; virus-scan hook (stretch). Pre-signed URLs scoped + short-lived. Bucket not public-by-default; serve via signed URLs or CDN. Enforce per-user quotas.

## Observability
- Metrics: upload count/size/latency/failures, storage usage. Trace upload → store → URL (pairs with Idea 01). Circuit-breaker state metrics for posts→connections.

## Failure scenarios
- Storage down → upload fails gracefully; composer shows error; post can still publish text-only.
- Large file → rejected client+server side before storage.
- Orphaned objects (post deleted) → background cleanup job.
- connections-service down → circuit breaker opens → feed falls back (no user-facing 500).

## DevOps impact
Adds MinIO (local) / S3 (cloud) to the stack (compose/k8s), a bucket lifecycle policy, and Resilience4j config. Teaches object storage, pre-signed URLs, and resilience.

## Testing impact
- Upload contract tests (type/size validation, URL returned). Migration test: existing base64 posts still render (back-compat). Chaos test: kill connections-service, assert feed fallback.

## Suggested phases
1. media-service + MinIO (local) + `api/media.js`; new posts use URLs.
2. Back-compat: keep rendering legacy base64 posts; optional one-off migration.
3. Pre-signed direct uploads + thumbnails + quotas.
4. Resilience4j around posts→connections + fallback + metrics.

## Risks
- Migrating/representing legacy base64 posts (keep dual rendering).
- Security of uploads (validation is critical).
- Scope: do media + resilience together or split?

## Open questions for audit
- MinIO-only (local learning) or real S3 (cloud cost)?
- Service-mediated upload vs pre-signed direct-to-storage for v1?
- Migrate existing base64 posts, or only apply to new posts?
- Bundle the posts→connections resilience here, or split into its own task?
