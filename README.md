# DriveLog

A mobile-friendly driving test marking sheet based on the DVSA DL25 report. Record faults in two taps, capture their GPS locations, and share a read-only results page through a single link.

**[Open DriveLog](https://certifiedjimenez.github.io/drivelog/)**

## Using the app

1. Open the app to start a fresh marking sheet.
2. Tap a fault, then select **Minor**, **Serious** (major), or **Dangerous**. Each mark records its category, fault type, severity and time, plus GPS coordinates when available.
3. Use **Undo** to remove the most recent mark.
4. Select **Finish** to open the results through an encoded URL.
5. Select **Share** to send the results through the phone’s share sheet, including WhatsApp when available. Browsers without native sharing offer a link to copy.
6. Select **New** to return to a fresh marking sheet.

Results include severity totals, start and finish times, duration, a category breakdown with counts and recorded times, and a map of located faults. Results cannot be edited. A test with no recorded faults can also be finished and shared.

## Grid and list views

The marking sheet defaults to a grid: two columns on mobile and up to three on desktop. The footer offers one inline link, **Switch to List** or **Switch to Grid**, showing the alternative layout. This option appears only on the marking page.

A `drivelog-layout` preference cookie remembers the choice for one year. It contains only the layout choice, with no test or location data.

## Sharing and data

The app uses plain HTML, CSS and JavaScript, hosted on GitHub Pages. It needs no account, build step or backend database.

- The normal URL opens the marking sheet. A URL containing `?lesson=…` opens read-only results; the parameter name remains compatible with earlier shared links.
- New links contain the JSON compressed with LZ-String and encoded using a URL-safe Base64 alphabet, prefixed with `v2.`. Earlier raw-JSON and `v1.` links still open.
- Links contain a snapshot of the complete report, including recorded GPS locations. Anyone with the link can view it. Encoding is not encryption, and shared reports do not update after sharing.
- An unfinished test exists only in the current page. Finish and keep its results link before refreshing or closing the page. Reports can be reopened from their links.
- There is no saved-test list or JSON upload/download. Earlier browser-stored records are left untouched but are no longer loaded.

URLs are limited to 7,000 characters for compatibility. If a compressed report exceeds that limit, the app displays an error and keeps the marking sheet available. Malformed links show an error rather than an editable sheet.

## Social previews

Open Graph and X/Twitter Card metadata are included in the initial HTML, with a generic 1200 × 630 PNG, title and description. WhatsApp, Facebook, LinkedIn, iMessage, Telegram, X and other clients can use the metadata they support. App settings, preview caches and platform behaviour determine the final appearance and whether the full URL is displayed; hiding the URL cannot be forced by the site.

The preview contains no exam-specific data. There is no static `og:url` or canonical URL pointing to the blank sheet, because shared links must retain their encoded results query. The generated artwork and icons are in `assets/`; regenerate them with `python3 scripts/create-preview.py` on macOS with Pillow and the system Arial fonts available.

## GPS and maps

Location permission is requested when selecting the first fault. Missing or denied GPS is shown explicitly; faults can still be recorded without it. A GPS fix must be within 15 seconds of the mark time. Finishing before a pending fix arrives excludes that fix from the results.

The map shows individual fault locations, not a continuous route. OpenStreetMap tiles need internet. Tile requests send only the site origin as the referrer, keeping the report query out of it. Background or locked-phone location is not guaranteed.

## Run locally

From this directory:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Open [localhost:8080](http://localhost:8080). GPS requires HTTPS when hosted; desktop localhost also works. Opening `index.html` directly may restrict location access.

Run the automated checks with Node.js:

```sh
node --test tests/import.test.cjs
```

Checks cover marking and undo, finishing into a read-only URL, encoded link round trips and compatibility, validation, sharing fallbacks, results breakdowns, and the layout preference cookie.

## Reference and credits

Based on the [DVSA DL25 driving test report](https://assets.publishing.service.gov.uk/media/62a7437cd3bf7f03667c667a/dl25-driving-test-report.pdf) (Crown copyright). DriveLog is an independent practice tool, not an official DVSA test or an automated pass/fail assessment.

Bundled libraries: [Leaflet 1.9.4](https://leafletjs.com/) (BSD-2-Clause) and [LZ-String 1.5.0](https://github.com/pieroxy/lz-string) (MIT). Licence files are in `vendor/`. Map data is credited to OpenStreetMap contributors on the map.
