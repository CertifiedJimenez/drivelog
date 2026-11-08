# Driving fault sheet

A plain HTML, CSS and JavaScript app based on the DVSA DL25 fault sheet.

1. Open `index.html` for a quick look, or serve this folder locally:
   ```sh
   python3 -m http.server 8080 --bind 127.0.0.1
   ```
2. Visit http://localhost:8080.
3. Tap a fault, then choose Minor, Serious (major) or Dangerous. That records it.
4. Finish the lesson to review the log, map and download the JSON record.

Learner name is optional. Every fault stores category, fault type, severity and time. GPS coordinates, accuracy and fix time are included when available. Location is requested at the first fault selection. Missing or denied GPS is shown explicitly, without inventing a location. A fix must be within 15 seconds of the fault time to attach to the record. Leaflet is bundled locally; OpenStreetMap tiles need internet. The map does not draw or store a continuous route.

Lessons are saved in localStorage in this browser and origin. They are not synced across devices. Browser data clearing removes records; use Download lesson for a backup. Use HTTPS when hosting for mobile GPS; localhost works for desktop testing. Opening a plain file may restrict GPS or browser storage. Background or locked phone location is not guaranteed.

Based on https://assets.publishing.service.gov.uk/media/62a7437cd3bf7f03667c667a/dl25-driving-test-report.pdf (Crown copyright). Independent instructor practice tool, not an official DVSA test or an automated pass/fail assessment.

Leaflet 1.9.4: https://leafletjs.com (BSD-2-Clause). Map attribution is displayed on the map.
