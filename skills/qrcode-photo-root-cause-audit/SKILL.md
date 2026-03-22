---
name: qrcode-photo-root-cause-audit
description: Diagnose why a photo does not appear after scanning a QR code in a web app with public pages, media delivery, uploads, cache layers, or environment-dependent URLs. Use when Codex must audit the end-to-end flow from QR generation to public page rendering, identify the root cause with evidence, compare the implementation against production patterns used by companies, and recommend or implement fixes.
---

# QR Code Photo Root Cause Audit

Audit the full path `QR code -> public URL -> page render -> photo URL -> media response -> persisted storage`.

## Workflow

1. Map the production path before changing code.
   - Find where the QR code URL is generated.
   - Find the public page opened by the QR code.
   - Find how the page chooses which measurement/photo to render.
   - Find the API/route that returns the image bytes.
   - Find where upload persistence stores the image.

2. Run the bundled script first.
   - Execute `python skills/qrcode-photo-root-cause-audit/scripts/audit_qrcode_photo_flow.py <repo-root>`.
   - Treat the script as a fast triage pass, not the final answer.
   - Use its output to decide which files need a deeper manual audit.

3. Confirm the storage mode.
   - Prefer records persisted in database/object storage.
   - Flag any dependency on legacy filesystem paths, external URLs, or data URLs.
   - If the code preserves a legacy `photoPath`, verify whether deploy/restart can break it.

4. Confirm cache correctness.
   - Check response headers for the photo route.
   - Check whether the image URL is versioned by `updatedAt`, content hash, or another mutation signal.
   - Treat `immutable` headers on non-versioned image URLs as a likely defect.

5. Confirm public-host correctness.
   - Inspect how the app decides the base URL embedded in QR codes.
   - Flag `localhost`, private IPs, or proxy/header-dependent fallbacks as operational risk.
   - Prefer a fixed canonical public domain in production.

6. Compare with production-grade patterns.
   - Read `references/production-patterns.md` when the user asks how companies operate this flow.
   - Use it to contrast the current code against standard practices: object storage, CDN, signed uploads, cache versioning, monitoring, retries, and synthetic checks.

7. Deliver the result in this order.
   - Root cause hypothesis ranked by confidence.
   - File-level evidence.
   - Reproduction path.
   - Recommended fix.
   - Operational follow-ups.

## What to look for

- QR codes pointing to the wrong host or a non-shareable environment.
- Public pages reading only the latest measurement when that measurement has no photo.
- Image routes returning stale cache headers after edits.
- Upload flows that validate the file but do not persist it durably.
- Legacy media fallback logic hiding partial migrations.
- Service worker or CDN rules interfering with image freshness.

## Output expectations

When you use this skill, produce:
- a concise root-cause summary;
- a step-by-step end-to-end audit;
- comparison with production patterns from `references/production-patterns.md`;
- concrete code/config changes if the bug is in scope.
