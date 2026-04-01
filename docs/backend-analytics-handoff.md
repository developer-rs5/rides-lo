# Rides Lo Analytics Backend Handoff

## Purpose

This document is the handoff spec for the separate backend team that will receive analytics events from the Rides Lo website.

The frontend already emits analytics events for:

- page views
- page exits
- scroll milestones
- section visibility
- navigation clicks
- app download clicks
- contact actions
- contact form submissions
- rider onboarding step views
- rider onboarding step completion/review actions
- rider document checklist actions
- FAQ toggles

## Recommended Base URL

Use a dedicated API domain instead of serving analytics from the website origin.

Recommended website domain:

```text
https://rideslo.in
```

Recommended production API domain:

```text
https://api.rideslo.in
```

Recommended production base URL:

```text
https://api.rideslo.in/v1
```

Recommended staging website domain:

```text
https://staging.rideslo.in
```

Recommended staging API domain:

```text
https://staging-api.rideslo.in
```

Recommended staging base URL:

```text
https://staging-api.rideslo.in/v1
```

Recommended local website domain:

```text
http://localhost:3000
```

Recommended local API base URL:

```text
http://localhost:4000/v1
```

## Frontend Endpoint Target

Frontend should send analytics to:

```text
{BASE_URL}/analytics/events
```

Example production write URL:

```text
https://api.rideslo.in/v1/analytics/events
```

Example website to API integration:

```text
Website: https://rideslo.in
API: https://api.rideslo.in/v1
Ingestion endpoint: https://api.rideslo.in/v1/analytics/events
```

## Transport Requirements

- Method: `POST`
- Content-Type: `application/json`
- Response format: `application/json`
- CORS: allow the Rides Lo website origin(s)
- Support `sendBeacon` / `keepalive` style page-exit requests

## Event Envelope

Each analytics event sent from the frontend has this envelope:

```json
{
  "eventName": "page_view",
  "page": "become-rider",
  "path": "/become-rider.html",
  "title": "Become a Rider with Rides Lo | Driver Signup, Taxi Partner Process in Sikar",
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

## Required Fields

Backend must require:

- `eventName`
- `page`

## Optional Fields

Backend should accept:

- `path`
- `title`
- `referrer`
- `sessionId`
- `language`
- `viewport`
- `timestamp`
- `payload`

## Server-Enriched Fields

Backend should append and persist:

- `id`
- `receivedAt`
- `ip`
- `userAgent`
- `origin` or `host`

Stored event example:

```json
{
  "id": "evt_q7h2d1km",
  "eventName": "page_view",
  "page": "become-rider",
  "path": "/become-rider.html",
  "title": "Become a Rider with Rides Lo | Driver Signup, Taxi Partner Process in Sikar",
  "referrer": "direct",
  "sessionId": "rl-abc123xy-m9z6za1q",
  "language": "en-IN",
  "viewport": "1440x900",
  "timestamp": "2026-04-01T10:30:00.000Z",
  "receivedAt": "2026-04-01T10:30:00.210Z",
  "payload": {
    "keywords": ["Rides Lo", "taxi in Sikar"]
  },
  "ip": "103.44.10.20",
  "userAgent": "Mozilla/5.0 ...",
  "origin": "https://rideslo.in"
}
```

## Write Endpoint

### `POST /analytics/events`

Primary ingestion endpoint.

### Accepted request shapes

#### Single event

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

#### Batch event request

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

### Success response

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

### Validation failure

```http
400 Bad Request
```

```json
{
  "success": false,
  "error": "At least one valid event with eventName and page is required"
}
```

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

### Payload too large

```http
413 Payload Too Large
```

```json
{
  "success": false,
  "error": "Payload too large"
}
```

## Optional Read Endpoints

These are not required for frontend tracking, but are useful for admin/ops dashboards.

### `GET /analytics/events?limit=100`

Returns recent events.

Example response:

```json
{
  "success": true,
  "events": [
    {
      "id": "evt_q7h2d1km",
      "eventName": "page_view",
      "page": "become-rider",
      "path": "/become-rider.html",
      "title": "Become a Rider with Rides Lo | Driver Signup, Taxi Partner Process in Sikar",
      "sessionId": "rl-abc123xy-m9z6za1q",
      "timestamp": "2026-04-01T10:30:00.000Z",
      "receivedAt": "2026-04-01T10:30:00.210Z",
      "payload": {
        "keywords": ["Rides Lo", "taxi in Sikar"]
      }
    }
  ]
}
```

### `GET /analytics/summary?limit=1000`

Returns aggregate totals.

Example response:

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

### `GET /health`

Example response:

```json
{
  "status": "ok",
  "service": "rides-lo-analytics-api",
  "now": "2026-04-01T10:40:00.000Z"
}
```

## Frontend Fields Automatically Sent

The current frontend tracker automatically includes these fields on every event:

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

## Event Catalog

### `page_view`

When sent:
- automatically on page load

Payload example:

```json
{
  "keywords": ["Rides Lo", "RidesLo", "taxi in Sikar"]
}
```

### `page_exit`

When sent:
- on `pagehide`
- on `beforeunload`

Payload example:

```json
{
  "timeOnPageMs": 18243,
  "maxScrollDepth": 76
}
```

### `scroll_depth`

When sent:
- when scroll depth crosses milestone thresholds

Current milestones:
- `25`
- `50`
- `75`
- `100`

Payload example:

```json
{
  "milestone": 50
}
```

### `section_view`

When sent:
- when a tracked block becomes visible in the viewport

Payload example:

```json
{
  "sectionId": "home_hero_panel"
}
```

### `nav_click`

When sent:
- click on tracked navigation link

Payload example:

```json
{
  "label": "become-rider",
  "id": null,
  "href": "become-rider.html"
}
```

### `download_click`

When sent:
- click on tracked app download links

Payload example:

```json
{
  "label": "header-download",
  "id": null,
  "href": "https://play.google.com/store/apps/details?id=com.rideslo.rider"
}
```

### `cta_click`

When sent:
- click on non-download CTA links/buttons

Payload example:

```json
{
  "label": "rider-hero-view-steps",
  "id": null,
  "href": "#rider-steps"
}
```

### `contact_click`

When sent:
- click on phone/email/contact-action links on contact page

Payload example:

```json
{
  "label": "phone-call",
  "id": null,
  "href": "tel:+917300042588"
}
```

### `contact_submit_click`

When sent:
- click on the contact form submit button

Payload example:

```json
{
  "label": "contact-form-submit",
  "id": null,
  "href": null
}
```

### `contact_form_submit`

When sent:
- after basic frontend validation passes on the contact form

Payload example:

```json
{
  "nameLength": 14,
  "phoneDigits": 10,
  "hasEmail": true
}
```

### `rider_process_loaded`

When sent:
- when the rider onboarding page initializes

Payload example:

```json
{
  "steps": 4
}
```

### `rider_step_nav`

When sent:
- click on step pill navigation inside rider page

Payload example:

```json
{
  "stepId": "step-2"
}
```

### `rider_step_view`

When sent:
- when a rider step card becomes visible

Payload example:

```json
{
  "stepNumber": "2",
  "stepTitle": "Personal details"
}
```

### `rider_step_complete`

When sent:
- button click on `Mark Step Reviewed`
- comes from the tracked button attribute itself

Payload example:

```json
{
  "label": "step-2-reviewed",
  "id": null,
  "href": null
}
```

### `rider_step_reviewed`

When sent:
- after frontend logic marks a rider step as reviewed

Payload example:

```json
{
  "stepNumber": "2"
}
```

### `document_checklist_toggle`

When sent:
- checkbox toggle in rider document checklist

Payload example:

```json
{
  "documentType": "aadhaar-front",
  "checked": true
}
```

### `rider_signup_ready`

When sent:
- final rider signup CTA click before app handoff

Payload example:

```json
{
  "label": "final-download-signup",
  "id": null,
  "href": "https://play.google.com/store/apps/details?id=com.rideslo.rider"
}
```

### `faq_toggle`

When sent:
- FAQ interaction on tracked FAQ blocks

Payload example:

```json
{
  "label": "rider-faq-documents",
  "id": null,
  "href": null
}
```

## Backend Validation Rules

Recommended validation rules:

- reject non-JSON request bodies
- require `eventName` as non-empty string
- require `page` as non-empty string
- cap request body size
- cap batch size
- normalize missing optional fields to sane defaults
- accept unknown `payload` keys for forward compatibility

## Backend Implementation Notes

Recommended:

- write asynchronously to DB / queue
- do not block response on heavy analytics aggregation
- support batch inserts
- log ingestion errors
- deduplicate only if you intentionally add event-id semantics later
- preserve raw payload for debugging
- add rate limiting and origin restrictions in production

## Suggested Database Shape

Suggested columns / fields:

- `id`
- `event_name`
- `page`
- `path`
- `title`
- `referrer`
- `session_id`
- `language`
- `viewport`
- `client_timestamp`
- `received_at`
- `payload_json`
- `ip`
- `user_agent`
- `origin`

## cURL Examples

### Single event

```bash
curl -X POST https://api.rideslo.in/v1/analytics/events \
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

### Batch event request

```bash
curl -X POST https://api.rideslo.in/v1/analytics/events \
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

## Frontend Integration Note

Once the separate backend is ready, frontend should stop using relative path ingestion and instead point to the external API base URL.

Recommended frontend config:

```text
ANALYTICS_API_BASE_URL=https://api.rideslo.in/v1
```

Final write target used by frontend:

```text
${ANALYTICS_API_BASE_URL}/analytics/events
```
