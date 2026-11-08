# Driving fault sheet

A plain HTML, CSS and JavaScript app based on the DVSA DL25 fault sheet.

Run locally:
```sh
python3 -m http.server 8080 --bind 127.0.0.1
```
Visit http://localhost:8080. Mobile GPS needs HTTPS when hosted; desktop localhost also works.

- Normal URL: a fresh marking sheet. Tap a fault, then Minor, Serious (major) or Dangerous.
- **Finish lesson**: redirects to a URL with the lesson JSON encoded in the `lesson` query parameter. No extra confirmation step.
- URL with `?lesson=…`: read-only report with fault counts, log, map and **Share lesson**. Invalid links show an error rather than an editable sheet.
- **Share lesson**: opens the native share sheet where supported (including WhatsApp if installed), or a copy-link fallback.
- **New lesson**: returns to the normal URL with a fresh sheet.

There is no saved-lesson list, JSON upload/download, account or server-side lesson storage. An unfinished sheet is held only in the current page; finish and share it before refreshing/closing the page. Completed reports reload directly from their URL. Existing saved data from earlier versions is left untouched but is no longer read.

Each fault contains its category, fault type, severity and time. GPS coordinates, accuracy and fix time are included when available. Location is requested at the first fault selection. Missing/denied GPS is shown explicitly. A fix must be within 15 seconds of the fault time to attach to it. Pending fixes are not included if you finish before they arrive. The map stores fault locations, not a continuous route. Map tiles send only the site origin as the referrer (never the lesson query), as required by OpenStreetMap’s tile policy. Map tiles need internet; locked/background phone location is not guaranteed.

Share links are snapshots, contain the recorded locations, and can be read by anyone who receives them. JSON is encoded directly for small reports. Larger reports use a versioned `v1.` compressed JSON value to keep the same query-based flow; both formats open automatically. URLs are limited to 7,000 characters for compatibility. If even a compressed report exceeds that limit, it remains on the marking sheet and shows an error without discarding its data. Data is encoded, not encrypted. No shortener or external lesson database is used.

Checks: `node --test tests/import.test.cjs`

Based on https://assets.publishing.service.gov.uk/media/62a7437cd3bf7f03667c667a/dl25-driving-test-report.pdf (Crown copyright). Independent instructor practice tool, not an official DVSA test or automated pass/fail assessment.

Bundled dependencies: Leaflet 1.9.4 (BSD-2-Clause) and LZ-String 1.5.0 (MIT); licence files are in `vendor/`. OpenStreetMap attribution appears on the map.
