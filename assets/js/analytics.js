(function () {
  const endpoint = "/api/analytics/events";
  const sessionStorageKey = "rideslo_session_id";
  const milestones = [25, 50, 75, 100];
  const firedMilestones = new Set();
  const viewedElements = new WeakSet();
  const pageStart = Date.now();
  let maxScrollDepth = 0;

  function getSessionId() {
    const existing = window.localStorage.getItem(sessionStorageKey);
    if (existing) {
      return existing;
    }

    const sessionId = "rl-" + Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
    window.localStorage.setItem(sessionStorageKey, sessionId);
    return sessionId;
  }

  const sessionId = getSessionId();

  function getPageName() {
    return document.body.dataset.page || window.location.pathname.replace("/", "") || "home";
  }

  function buildBasePayload() {
    return {
      sessionId,
      page: getPageName(),
      path: window.location.pathname,
      title: document.title,
      referrer: document.referrer || "direct",
      viewport: window.innerWidth + "x" + window.innerHeight,
      language: navigator.language || "en-IN",
      timestamp: new Date().toISOString()
    };
  }

  function sendEvent(eventName, payload, useBeacon) {
    const eventPayload = Object.assign(buildBasePayload(), {
      eventName,
      payload: payload || {}
    });

    const body = JSON.stringify(eventPayload);

    if (useBeacon && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(endpoint, blob);
      return;
    }

    window.fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: Boolean(useBeacon)
    }).catch(function () {
      return null;
    });
  }

  window.RidesLoAnalytics = {
    sessionId,
    track: sendEvent
  };

  function onReady() {
    const keywordsTag = document.querySelector('meta[name="keywords"]');
    sendEvent("page_view", {
      keywords: keywordsTag ? keywordsTag.content.split(",").map(function (item) { return item.trim(); }).slice(0, 10) : []
    });

    document.addEventListener("click", function (event) {
      const target = event.target.closest("[data-analytics-event]");
      if (!target) {
        return;
      }

      sendEvent(target.dataset.analyticsEvent, {
        label: target.dataset.analyticsLabel || target.textContent.trim().slice(0, 80),
        id: target.id || null,
        href: target.getAttribute("href") || null
      });
    });

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || viewedElements.has(entry.target)) {
          return;
        }

        viewedElements.add(entry.target);
        sendEvent("section_view", {
          sectionId: entry.target.dataset.analyticsView || entry.target.id || entry.target.className
        });
      });
    }, { threshold: 0.35 });

    document.querySelectorAll("[data-analytics-view]").forEach(function (node) {
      observer.observe(node);
    });

    window.addEventListener("scroll", function () {
      const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const scrollDepth = Math.round((window.scrollY / scrollable) * 100);
      maxScrollDepth = Math.max(maxScrollDepth, scrollDepth);

      milestones.forEach(function (milestone) {
        if (scrollDepth >= milestone && !firedMilestones.has(milestone)) {
          firedMilestones.add(milestone);
          sendEvent("scroll_depth", { milestone });
        }
      });
    }, { passive: true });

    function sendExitEvent() {
      sendEvent("page_exit", {
        timeOnPageMs: Date.now() - pageStart,
        maxScrollDepth
      }, true);
    }

    window.addEventListener("pagehide", sendExitEvent);
    window.addEventListener("beforeunload", sendExitEvent);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }
})();
