(function () {
  "use strict";

  var OWNER = "CommandCodeAI";
  var REPO = "commandcode-status";
  var RAW_BASE = "https://raw.githubusercontent.com/" + OWNER + "/" + REPO + "/master/history/";
  var ISSUES_URL = "https://api.github.com/repos/" + OWNER + "/" + REPO + "/issues?state=all&per_page=100";
  var WINDOW_DAYS = 90;
  var DAY_MS = 24 * 60 * 60 * 1000;
  var MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  var SPINNER =
    '<div class="loading"><svg height="38" stroke="#aaa" width="38" xmlns="http://www.w3.org/2000/svg">' +
    '<g fill="none" fill-rule="evenodd"><g stroke-width="2" transform="translate(1 1)">' +
    '<circle cx="18" cy="18" r="18" stroke-opacity=".5"></circle>' +
    '<path d="M36 18c0-9.94-8.06-18-18-18"><animateTransform attributeName="transform" dur="1s" ' +
    'from="0 18 18" repeatCount="indefinite" to="360 18 18" type="rotate"></animateTransform></path>' +
    "</g></g></svg></div>";

  var SECTION_HTML =
    '<section id="system-status" class="system-status" aria-labelledby="system-status-heading">' +
    '<div class="f changed"><h2 id="system-status-heading">System status</h2>' +
    '<div class="status-nav">' +
    '<button type="button" class="status-nav-btn" data-dir="prev" aria-label="Previous period" disabled>‹</button>' +
    '<span class="status-range" id="system-status-range">Loading…</span>' +
    '<button type="button" class="status-nav-btn" data-dir="next" aria-label="Next period" disabled>›</button>' +
    "</div></div>" +
    '<div id="system-status-rows" class="status-rows">' +
    SPINNER +
    "</div></section>";

  // Sapper hydrates over the SSR'd DOM and discards any element it
  // doesn't recognize as part of its own component tree — so this
  // section can't just be static markup in index.html, it has to be
  // built and (re-)inserted from script, and watched in case
  // hydration tears it out from under us.
  function findAnchor() {
    return document.querySelector(".f.changed");
  }

  function buildSection() {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = SECTION_HTML;
    return wrapper.firstElementChild;
  }

  var refs = null; // { root, rangeLabel, prevBtn, nextBtn }

  function ensureSection() {
    var existing = document.getElementById("system-status");
    if (existing) return existing;

    var anchor = findAnchor();
    if (!anchor || !anchor.parentNode) return null;

    var section = buildSection();
    anchor.parentNode.insertBefore(section, anchor);

    refs = {
      root: section.querySelector("#system-status-rows"),
      rangeLabel: section.querySelector("#system-status-range"),
      prevBtn: section.querySelector('.status-nav-btn[data-dir="prev"]'),
      nextBtn: section.querySelector('.status-nav-btn[data-dir="next"]'),
    };
    refs.prevBtn.addEventListener("click", onPrev);
    refs.nextBtn.addEventListener("click", onNext);

    if (state.ready) render();
    else if (state.error) showError();

    return section;
  }

  function watchForRemoval() {
    var host = document.querySelector("main.container") || document.body;
    if (!host || !window.MutationObserver) return;
    new MutationObserver(function () {
      if (!document.getElementById("system-status")) ensureSection();
    }).observe(host, { childList: true });
  }

  function toDateOnly(d) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  function addDays(d, n) {
    return new Date(d.getTime() + n * DAY_MS);
  }

  function formatRange(start, end) {
    var s = MONTH_NAMES[start.getUTCMonth()] + " " + start.getUTCFullYear();
    var e = MONTH_NAMES[end.getUTCMonth()] + " " + end.getUTCFullYear();
    return s === e ? s : s + " – " + e;
  }

  function fetchJson(url) {
    return fetch(url, { headers: { Accept: "application/vnd.github+json" } }).then(function (res) {
      if (!res.ok) throw new Error("Request failed: " + res.status);
      return res.json();
    });
  }

  function parseFrontMatterDate(body, key) {
    var m = body && body.match(new RegExp(key + ":\\s*([^\\n]+)"));
    return m ? new Date(m[1].trim()) : null;
  }

  // Turn incident/maintenance issues into day-level severity windows.
  function classifyIssue(issue) {
    var labels = (issue.labels || []).map(function (l) {
      return typeof l === "string" ? l : l.name;
    });
    var isStatus = labels.indexOf("status") !== -1;
    var isMaintenance = labels.indexOf("maintenance") !== -1;
    if (!isStatus && !isMaintenance) return null;

    var body = issue.body || "";
    var start = parseFrontMatterDate(body, "start") || new Date(issue.created_at);
    var end = parseFrontMatterDate(body, "end") || (issue.state === "closed" ? new Date(issue.closed_at) : new Date());

    var severity;
    if (/expectedDown/i.test(body)) severity = "down";
    else if (/expectedDegraded/i.test(body)) severity = "degraded";
    else if (/degrad|latency|slow/i.test(issue.title + " " + body)) severity = "degraded";
    else severity = "down";

    // Maintenance windows are shown as degraded (amber), never down (red).
    if (isMaintenance && severity === "down") severity = "degraded";

    return { start: toDateOnly(start), end: toDateOnly(end), severity: severity };
  }

  function severityOnDay(day, events) {
    var rank = { up: 0, degraded: 1, down: 2 };
    var worst = "up";
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      if (day >= ev.start && day <= ev.end && rank[ev.severity] > rank[worst]) {
        worst = ev.severity;
      }
    }
    return worst;
  }

  function statusLabel(status) {
    if (status === "down") return "Down";
    if (status === "degraded") return "Degraded performance";
    return "Operational";
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function renderRow(site, events, siteStart, windowStart, windowEnd) {
    var row = el("article", "status-row " + site.status);

    var head = el("div", "status-row-head");
    head.appendChild(el("span", "status-dot"));
    head.appendChild(el("span", "status-name", site.name));
    head.appendChild(el("span", "status-label", statusLabel(site.status)));

    var bar = el("div", "status-bar");
    bar.setAttribute("role", "img");

    var dataDays = 0;
    var downDays = 0;
    var cursor = windowStart;
    while (cursor <= windowEnd) {
      var cell = el("span", "status-cell");
      if (siteStart && cursor < siteStart) {
        cell.className += " no-data";
        cell.title = "No data";
      } else {
        var sev = severityOnDay(cursor, events);
        cell.className += " " + sev;
        var dateStr = cursor.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
        cell.title = dateStr + " — " + statusLabel(sev);
        dataDays++;
        if (sev === "down") downDays++;
      }
      bar.appendChild(cell);
      cursor = addDays(cursor, 1);
    }

    var uptimePct = dataDays > 0 ? (((dataDays - downDays) / dataDays) * 100).toFixed(2) : "100.00";
    head.appendChild(el("span", "status-uptime", uptimePct + "% uptime"));

    row.appendChild(head);
    row.appendChild(bar);
    return row;
  }

  var state = {
    ready: false,
    error: false,
    sites: null,
    issuesBySlug: {},
    startBySlug: {},
    windowEnd: toDateOnly(new Date()),
  };

  function render() {
    if (!refs || !refs.root) return;
    var today = toDateOnly(new Date());
    var windowStart = addDays(state.windowEnd, -(WINDOW_DAYS - 1));

    refs.root.innerHTML = "";
    state.sites.forEach(function (site) {
      var events = state.issuesBySlug[site.slug] || [];
      var siteStart = state.startBySlug[site.slug] || null;
      refs.root.appendChild(renderRow(site, events, siteStart, windowStart, state.windowEnd));
    });
    refs.rangeLabel.textContent = formatRange(windowStart, state.windowEnd);

    var earliestStart = state.sites.reduce(function (min, site) {
      var s = state.startBySlug[site.slug];
      if (!s) return min;
      return !min || s < min ? s : min;
    }, null);
    refs.prevBtn.disabled = !!earliestStart && windowStart <= earliestStart;
    refs.nextBtn.disabled = state.windowEnd >= today;
  }

  function showError() {
    if (!refs || !refs.root) return;
    refs.root.innerHTML = "";
    refs.root.appendChild(el("p", "status-error", "Status data is unavailable right now."));
    refs.rangeLabel.textContent = "";
    refs.prevBtn.disabled = true;
    refs.nextBtn.disabled = true;
  }

  function onPrev() {
    state.windowEnd = addDays(state.windowEnd, -WINDOW_DAYS);
    render();
  }

  function onNext() {
    var today = toDateOnly(new Date());
    state.windowEnd = addDays(state.windowEnd, WINDOW_DAYS);
    if (state.windowEnd > today) state.windowEnd = today;
    render();
  }

  function loadData() {
    fetchJson(RAW_BASE + "summary.json")
      .then(function (sites) {
        state.sites = sites;

        var startFetches = sites.map(function (site) {
          return fetch(RAW_BASE + site.slug + ".yml")
            .then(function (res) {
              return res.ok ? res.text() : "";
            })
            .then(function (text) {
              var m = text.match(/startTime:\s*([^\n]+)/);
              if (m) state.startBySlug[site.slug] = toDateOnly(new Date(m[1].trim()));
            })
            .catch(function () {});
        });

        var issuesFetch = fetchJson(ISSUES_URL)
          .then(function (issues) {
            var events = issues.map(classifyIssue).filter(Boolean);
            sites.forEach(function (site) {
              state.issuesBySlug[site.slug] = events;
            });
          })
          .catch(function () {
            // Rate-limited or offline — fall back to an all-green bar.
            sites.forEach(function (site) {
              state.issuesBySlug[site.slug] = [];
            });
          });

        return Promise.all(startFetches.concat([issuesFetch]));
      })
      .then(function () {
        state.ready = true;
        render();
      })
      .catch(function () {
        state.error = true;
        showError();
      });
  }

  ensureSection();
  watchForRemoval();
  loadData();
})();
