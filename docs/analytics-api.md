# Rides Lo Analytics API

## Overview

The analytics backend lives in `server.js` and accepts page, navigation, CTA, contact, and rider-onboarding events from the frontend tracker.

Write endpoints:

- `POST /api/analytics/events`
- `POST /api/analytics/page-view`

Read endpoints:

- `GET /api/analytics/events`
- `GET /api/analytics/summary`
- `GET /api/health`

Storage:

- `data/analytics-events.ndjson`

## Base URL

Local:

```text
http://127.0.0.1:3000
```

## Event Envelope

All events sent to the backend follow this shape:

```json
{
  "eventName": "page_view",
  "page": "become-rider",
  "path": "/become-rider.html",
  "title": "Become a Rider with Rides Lo",
  "referrer": "direct",
  "sessionId": "rl-abc123xy-m9z6za1q",
  "language": "en-IN",
  "viewport": "1440x900",
  "timestamp": "2026-04-01T10:30:00.000Z",
  "payload": {
    "keywords": ["Rides Lo", "taxi in Sikar"]
  }
}
```

## Required Request Fields

- `eventName`
- `page`

## Optional Request Fields

- `path`
- `title`
- `referrer`
- `sessionId`
- `language`
- `viewport`
- `timestamp`
- `payload`

## Server-Enriched Stored Fields

The backend appends these fields before writing each event:

- `id`
- `ip`
- `userAgent`

Stored event example:

```json
{
  "id": "evt_q7h2d1km",
  "eventName": "page_view",
  "page": "become-rider",
  "path": "/become-rider.html",
  "title": "Become a Rider with Rides Lo",
  "referrer": "direct",
  "sessionId": "rl-abc123xy-m9z6za1q",
  "language": "en-IN",
  "viewport": "1440x900",
  "timestamp": "2026-04-01T10:30:00.000Z",
  "payload": {
    "keywords": ["Rides Lo", "taxi in Sikar"]
  },
  "ip": "127.0.0.1",
  "userAgent": "Mozilla/5.0 ..."
}
```

## Request Modes

### Single Event Request

```json
{
  "eventName": "download_click",
  "page": "home",
  "path": "/",
  "payload": {
    "label": "header-download",
    "href": "https://play.google.com/store/apps/details?id=com.rideslo.rider"
  }
}
```

### Batch Request

```json
{
  "events": [
    {
      "eventName": "cta_click",
      "page": "home",
      "path": "/",
      "payload": {
        "label": "hero-become-rider"
      }
    },
    {
      "eventName": "rider_step_view",
      "page": "become-rider",
      "path": "/become-rider.html",
      "payload": {
        "stepNumber": "1",
        "stepTitle": "Account setup"
      }
    }
  ]
}
```

## Endpoint Reference

### `POST /api/analytics/events`

Primary analytics ingestion endpoint.

Success response:

```http
202 Accepted
```

```json
{
  "success": true,
  "accepted": 2,
  "ids": ["evt_a1b2c3d4", "evt_e5f6g7h8"]
}
```

Validation failure:

```http
400 Bad Request
```

```json
{
  "success": false,
  "error": "At least one valid event with eventName and page is required"
}
```

Invalid JSON:

```json
{
  "success": false,
  "error": "Invalid JSON payload"
}
```

### `POST /api/analytics/page-view`

Alias route using the same ingestion logic as `/api/analytics/events`.

Example:

```json
{
  "eventName": "page_view",
  "page": "contact",
  "path": "/contact.html",
  "title": "Contact RidesLo",
  "sessionId": "rl-page-001",
  "payload": {
    "keywords": ["rideslo contact", "taxi support sikar"]
  }
}
```

### `GET /api/analytics/events?limit=100`

Returns recent stored events in reverse chronological order.

Query params:

- `limit`: default `100`, min effective `1`, max effective `500`

Response:

```json
{
  "success": true,
  "events": [
    {
      "id": "evt_q7h2d1km",
      "eventName": "page_view",
      "page": "become-rider",
      "path": "/become-rider.html",
      "title": "Become a Rider with Rides Lo",
      "referrer": "direct",
      "sessionId": "rl-abc123xy-m9z6za1q",
      "language": "en-IN",
      "viewport": "1440x900",
      "timestamp": "2026-04-01T10:30:00.000Z",
      "payload": {
        "keywords": ["Rides Lo", "taxi in Sikar"]
      },
      "ip": "127.0.0.1",
      "userAgent": "Mozilla/5.0 ..."
    }
  ]
}
```

### `GET /api/analytics/summary?limit=100`

Returns aggregate totals over the most recent events.

```json
{
  "success": true,
  "summary": {
    "totalEvents": 18,
    "byEvent": {
      "page_view": 3,
      "download_click": 4,
      "rider_step_view": 6,
      "rider_step_reviewed": 2,
      "page_exit": 3
    },
    "byPage": {
      "home": 7,
      "become-rider": 9,
      "contact": 2
    },
    "latestEventAt": "2026-04-01T10:35:11.000Z"
  }
}
```

### `GET /api/health`

```json
{
  "status": "ok",
  "service": "rides-lo-analytics-api",
  "now": "2026-04-01T10:40:00.000Z"
}
```

## Error Cases

### Invalid JSON

```http
400 Bad Request
```

```json
{
  "success": false,
  "error": "Invalid JSON payload"
}
```

### Missing Required Fields

```http
400 Bad Request
```

```json
{
  "success": false,
  "error": "At least one valid event with eventName and page is required"
}
```

### Payload Too Large

```http
413 Payload Too Large
```

```json
{
  "success": false,
  "error": "Payload too large"
}
```

## Frontend Fields Sent Automatically

The frontend tracker in `assets/js/analytics.js` sends these base fields on every event:

```json
{
  "sessionId": "rl-abc123xy-m9z6za1q",
  "page": "become-rider",
  "path": "/become-rider.html",
  "title": "Become a Rider with Rides Lo | Driver Signup, Taxi Partner Process in Sikar",
  "referrer": "direct",
  "viewport": "1440x900",
  "language": "en-IN",
  "timestamp": "2026-04-01T10:30:00.000Z"
}
```

## Event Specs

### `page_view`

Sent on page load.

```json
{
  "keywords": ["Rides Lo", "RidesLo", "taxi in Sikar"]
}
```

### `page_exit`

Sent on `pagehide` and `beforeunload`.

```json
{
  "timeOnPageMs": 18243,
  "maxScrollDepth": 76
}
```

### `scroll_depth`

Milestones currently emitted: `25`, `50`, `75`, `100`

```json
{
  "milestone": 50
}
```

### `section_view`

```json
{
  "sectionId": "home_hero_panel"
}
```

### `nav_click`

```json
{
  "label": "become-rider",
  "id": null,
  "href": "become-rider.html"
}
```

### `download_click`

```json
{
  "label": "header-download",
  "id": null,
  "href": "https://play.google.com/store/apps/details?id=com.rideslo.rider"
}
```

### `cta_click`

```json
{
  "label": "rider-hero-view-steps",
  "id": null,
  "href": "#rider-steps"
}
```

### `contact_click`

```json
{
  "label": "phone-call",
  "id": null,
  "href": "tel:+917300042588"
}
```

### `contact_submit_click`

```json
{
  "label": "contact-form-submit",
  "id": null,
  "href": null
}
```

### `contact_form_submit`

Sent by `assets/js/contact.js`.

```json
{
  "nameLength": 14,
  "phoneDigits": 10,
  "hasEmail": true
}
```

### `rider_process_loaded`

```json
{
  "steps": 4
}
```

### `rider_step_nav`

```json
{
  "stepId": "step-2"
}
```

### `rider_step_view`

```json
{
  "stepNumber": "2",
  "stepTitle": "Personal details"
}
```

### `rider_step_complete`

```json
{
  "label": "step-2-reviewed",
  "id": null,
  "href": null
}
```

### `rider_step_reviewed`

```json
{
  "stepNumber": "2"
}
```

### `document_checklist_toggle`

```json
{
  "documentType": "aadhaar-front",
  "checked": true
}
```

### `rider_signup_ready`

```json
{
  "label": "final-download-signup",
  "id": null,
  "href": "https://play.google.com/store/apps/details?id=com.rideslo.rider"
}
```

### `faq_toggle`

```json
{
  "label": "rider-faq-documents",
  "id": null,
  "href": null
}
```

## cURL Examples

### Send One Event

```bash
curl -X POST http://127.0.0.1:3000/api/analytics/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventName": "page_view",
    "page": "home",
    "path": "/",
    "title": "RidesLo Home",
    "sessionId": "rl-demo-100",
    "payload": {
      "keywords": ["Rides Lo", "taxi in Sikar"]
    }
  }'
```

### Send a Batch

```bash
curl -X POST http://127.0.0.1:3000/api/analytics/events \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {
        "eventName": "download_click",
        "page": "home",
        "path": "/",
        "payload": {
          "label": "header-download"
        }
      },
      {
        "eventName": "rider_step_view",
        "page": "become-rider",
        "path": "/become-rider.html",
        "payload": {
          "stepNumber": "1",
          "stepTitle": "Account setup"
        }
      }
    ]
  }'
```

### Read Recent Events

```bash
curl "http://127.0.0.1:3000/api/analytics/events?limit=20"
```

### Read Summary

```bash
curl "http://127.0.0.1:3000/api/analytics/summary?limit=100"
```
