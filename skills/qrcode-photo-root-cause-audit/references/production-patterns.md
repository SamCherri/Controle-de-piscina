# Production patterns for QR code + public page + photo delivery

Use this reference when the user asks how companies usually build and operate this flow.

## What mature teams usually do

1. Generate QR codes from a canonical public domain.
   - Never depend on `localhost`, LAN IPs, or request headers alone in production.
   - Store the base URL in environment/config and validate it during deploy.

2. Persist photos in durable storage.
   - Prefer object storage such as S3, Cloudflare R2, GCS, or durable DB storage for small files.
   - Avoid relying on ephemeral container disk after upload.

3. Version every media URL.
   - Add a content hash, revision number, or `updatedAt` token to the image URL.
   - Only use long-lived immutable caching when the URL changes after every mutation.

4. Separate upload from delivery.
   - Upload -> validate -> persist metadata -> publish public URL.
   - Track content type, size, checksum, and storage origin.

5. Instrument the public flow.
   - Synthetic monitoring for `public page 200` and `photo 200`.
   - Logs/metrics on upload failure, missing asset, and legacy fallback usage.

6. Backfill legacy records aggressively.
   - Migrate old `photoPath` records to durable storage.
   - Treat legacy fallback as temporary, not permanent architecture.

## Red flags

- QR code works on the admin machine but not on another phone.
- Public page opens but image stays stale after photo replacement.
- Image route uses `immutable` without a versioned URL.
- Old measurements depend on local files that disappear after redeploy.
- No health check verifies public URL + photo retrieval together.
