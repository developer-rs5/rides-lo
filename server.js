const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const HOST = "127.0.0.1";
const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const ANALYTICS_FILE = path.join(DATA_DIR, "analytics-events.ndjson");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8"
};

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(ANALYTICS_FILE)) {
    fs.writeFileSync(ANALYTICS_FILE, "", "utf8");
  }
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(data, null, 2));
}

function sendText(response, statusCode, text, contentType) {
  response.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=300"
  });
  response.end(text);
}

function getClientIp(request) {
  return request.headers["x-forwarded-for"] || request.socket.remoteAddress || "";
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";

    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Payload too large"));
      }
    });

    request.on("end", () => resolve(raw));
    request.on("error", reject);
  });
}

function normalizeEvent(input, request) {
  const eventName = typeof input.eventName === "string" ? input.eventName.trim() : "";
  const page = typeof input.page === "string" ? input.page.trim() : "";

  if (!eventName || !page) {
    return null;
  }

  return {
    id: "evt_" + Math.random().toString(36).slice(2, 10),
    eventName,
    page,
    path: typeof input.path === "string" ? input.path : "",
    title: typeof input.title === "string" ? input.title : "",
    referrer: typeof input.referrer === "string" ? input.referrer : "",
    sessionId: typeof input.sessionId === "string" ? input.sessionId : "",
    language: typeof input.language === "string" ? input.language : "",
    viewport: typeof input.viewport === "string" ? input.viewport : "",
    timestamp: typeof input.timestamp === "string" ? input.timestamp : new Date().toISOString(),
    payload: input.payload && typeof input.payload === "object" ? input.payload : {},
    ip: getClientIp(request),
    userAgent: request.headers["user-agent"] || ""
  };
}

function persistEvents(events) {
  ensureStorage();
  const lines = events.map((event) => JSON.stringify(event)).join("\n") + "\n";
  fs.appendFileSync(ANALYTICS_FILE, lines, "utf8");
}

function loadEvents(limit) {
  ensureStorage();
  const raw = fs.readFileSync(ANALYTICS_FILE, "utf8").trim();
  if (!raw) {
    return [];
  }

  const items = raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean);

  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 500));
  return items.slice(-safeLimit).reverse();
}

function summarizeEvents(events) {
  const summary = {
    totalEvents: events.length,
    byEvent: {},
    byPage: {},
    latestEventAt: events[0] ? events[0].timestamp : null
  };

  events.forEach((event) => {
    summary.byEvent[event.eventName] = (summary.byEvent[event.eventName] || 0) + 1;
    summary.byPage[event.page] = (summary.byPage[event.page] || 0) + 1;
  });

  return summary;
}

function handleAnalyticsEvent(request, response, body) {
  let parsed;

  try {
    parsed = JSON.parse(body || "{}");
  } catch (error) {
    sendJson(response, 400, { success: false, error: "Invalid JSON payload" });
    return;
  }

  const eventList = Array.isArray(parsed.events) ? parsed.events : [parsed];
  const normalizedEvents = eventList
    .map((item) => normalizeEvent(item, request))
    .filter(Boolean);

  if (!normalizedEvents.length) {
    sendJson(response, 400, {
      success: false,
      error: "At least one valid event with eventName and page is required"
    });
    return;
  }

  persistEvents(normalizedEvents);

  sendJson(response, 202, {
    success: true,
    accepted: normalizedEvents.length,
    ids: normalizedEvents.map((event) => event.id)
  });
}

function routeApi(request, response, urlObject, body) {
  if (request.method === "GET" && urlObject.pathname === "/api/health") {
    sendJson(response, 200, {
      status: "ok",
      service: "rides-lo-analytics-api",
      now: new Date().toISOString()
    });
    return true;
  }

  if (request.method === "POST" && (urlObject.pathname === "/api/analytics/events" || urlObject.pathname === "/api/analytics/page-view")) {
    handleAnalyticsEvent(request, response, body);
    return true;
  }

  if (request.method === "GET" && urlObject.pathname === "/api/analytics/events") {
    const limit = urlObject.searchParams.get("limit");
    const events = loadEvents(limit);
    sendJson(response, 200, { success: true, events });
    return true;
  }

  if (request.method === "GET" && urlObject.pathname === "/api/analytics/summary") {
    const limit = urlObject.searchParams.get("limit");
    const events = loadEvents(limit);
    sendJson(response, 200, { success: true, summary: summarizeEvents(events) });
    return true;
  }

  return false;
}

function resolveStaticPath(urlPath) {
  const routeMap = {
    "/": "index.html",
    "/become-rider": "become-rider.html",
    "/contact": "contact.html"
  };

  const mapped = routeMap[urlPath] || urlPath.slice(1);
  const normalized = path.normalize(mapped || "index.html");
  const filePath = path.join(ROOT_DIR, normalized);

  if (!filePath.startsWith(ROOT_DIR)) {
    return null;
  }

  return filePath;
}

function serveStatic(response, filePath) {
  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendText(response, 404, "Not found", "text/plain; charset=utf-8");
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extension] || "application/octet-stream";
  const content = fs.readFileSync(filePath);
  response.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=300"
  });
  response.end(content);
}

const server = http.createServer(async (request, response) => {
  const urlObject = new URL(request.url, "http://localhost");

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    });
    response.end();
    return;
  }

  let body = "";
  if (request.method === "POST") {
    try {
      body = await readRequestBody(request);
    } catch (error) {
      sendJson(response, 413, { success: false, error: error.message });
      return;
    }
  }

  if (routeApi(request, response, urlObject, body)) {
    return;
  }

  serveStatic(response, resolveStaticPath(urlObject.pathname));
});

ensureStorage();

server.listen(PORT, HOST, () => {
  console.log("Rides Lo server running at http://" + HOST + ":" + PORT);
});
