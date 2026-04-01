# Rides Lo Frontend Analytics Integration

## Purpose

This file tells the frontend developer exactly how to connect the website to the separate backend analytics API.

## Domain and Base URL

Website domain:

```text
https://rideslo.in
```

Backend API domain:

```text
https://api.rideslo.in
```

Backend API base URL:

```text
https://api.rideslo.in/v1
```

Final analytics ingestion URL:

```text
https://api.rideslo.in/v1/analytics/events
```

## Current Frontend Behavior

Right now `assets/js/analytics.js` sends events to a relative endpoint:

```js
const endpoint = "/api/analytics/events";
```

That should be changed to use the external backend domain.

## Recommended Frontend Config

Use a configurable base URL instead of hardcoding the full endpoint in multiple places.

Recommended config variable:

```text
ANALYTICS_API_BASE_URL=https://api.rideslo.in/v1
```

## Recommended Frontend Logic

Replace the current endpoint declaration in `assets/js/analytics.js` with:

```js
const ANALYTICS_API_BASE_URL =
  window.ANALYTICS_API_BASE_URL || "https://api.rideslo.in/v1";

const endpoint = ANALYTICS_API_BASE_URL + "/analytics/events";
```

## HTML Injection Option

If you want to inject the API base URL from HTML before loading `analytics.js`, add this before the analytics script:

```html
<script>
  window.ANALYTICS_API_BASE_URL = "https://api.rideslo.in/v1";
</script>
```

Then keep this in `assets/js/analytics.js`:

```js
const ANALYTICS_API_BASE_URL =
  window.ANALYTICS_API_BASE_URL || "https://api.rideslo.in/v1";

const endpoint = ANALYTICS_API_BASE_URL + "/analytics/events";
```

## Event Target

All frontend analytics events should be posted to:

```text
POST https://api.rideslo.in/v1/analytics/events
```

## Headers

Send:

```http
Content-Type: application/json
```

## Request Shape

Example page view:

```json
{
  "eventName": "page_view",
  "page": "home",
  "path": "/",
  "title": "RidesLo Home",
  "referrer": "direct",
  "sessionId": "rl-abc123xy-m9z6za1q",
  "language": "en-IN",
  "viewport": "390x844",
  "timestamp": "2026-04-01T10:30:00.000Z",
  "payload": {
    "keywords": ["Rides Lo", "taxi in Sikar"]
  }
}
```

## Events Already Sent by Frontend

The current website code already emits these events:

- `page_view`
- `page_exit`
- `scroll_depth`
- `section_view`
- `nav_click`
- `download_click`
- `cta_click`
- `contact_click`
- `contact_submit_click`
- `contact_form_submit`
- `rider_process_loaded`
- `rider_step_nav`
- `rider_step_view`
- `rider_step_complete`
- `rider_step_reviewed`
- `document_checklist_toggle`
- `rider_signup_ready`
- `faq_toggle`

## Files Involved

Frontend tracking files:

- `assets/js/analytics.js`
- `assets/js/contact.js`
- `assets/js/become-rider.js`

Backend handoff file:

- `docs/backend-analytics-handoff.md`

## CORS Requirement

The backend team should allow requests from:

```text
https://rideslo.in
```

Optional staging origin:

```text
https://staging.rideslo.in
```

## Production Checklist

- Set `window.ANALYTICS_API_BASE_URL` or equivalent config to `https://api.rideslo.in/v1`
- Confirm backend supports `POST /analytics/events`
- Confirm CORS allows `https://rideslo.in`
- Confirm backend accepts `sendBeacon`/`keepalive` requests for `page_exit`
- Confirm backend stores unknown `payload` keys without breaking
