(function () {
  "use strict";

  var OWNER = "CommandCodeAI";
  var REPO = "commandcode-status";
  var RAW_BASE = "https://raw.githubusercontent.com/" + OWNER + "/" + REPO + "/master/history/";
  var ISSUES_URL = "https://api.github.com/repos/" + OWNER + "/" + REPO + "/issues?state=all&per_page=100";
  var WINDOW_DAYS = 90;
  var DAY_MS = 24 * 60 * 60 * 1000;
  var MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  var root = document.getElementById("system-status-rows");
  var rangeLabel = document.getElementById("system-status-range");
  var prevBtn = document.querySelector('.status-nav-btn[data-dir="prev"]');
  var nextBtn = document.querySelector('.status-nav-btn[data-dir="next"]');
  if (!root) return;

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

  function init(sites, issuesBySlug, startBySlug) {
    var today = toDateOnly(new Date());
    var windowEnd = today;

    function render() {
      var windowStart = addDays(windowEnd, -(WINDOW_DAYS - 1));
      root.innerHTML = "";
      sites.forEach(function (site) {
        var events = issuesBySlug[site.slug] || [];
        var siteStart = startBySlug[site.slug] || null;
        root.appendChild(renderRow(site, events, siteStart, windowStart, windowEnd));
      });
      rangeLabel.textContent = formatRange(windowStart, windowEnd);

      var earliestStart = sites.reduce(function (min, site) {
        var s = startBySlug[site.slug];
        if (!s) return min;
        return !min || s < min ? s : min;
      }, null);
      prevBtn.disabled = !!earliestStart && windowStart <= earliestStart;
      nextBtn.disabled = windowEnd >= today;
    }

    prevBtn.addEventListener("click", function () {
      windowEnd = addDays(windowEnd, -WINDOW_DAYS);
      render();
    });
    nextBtn.addEventListener("click", function () {
      windowEnd = addDays(windowEnd, WINDOW_DAYS);
      if (windowEnd > today) windowEnd = today;
      render();
    });

    render();
  }

  fetchJson(RAW_BASE + "summary.json")
    .then(function (sites) {
      var startBySlug = {};
      var startFetches = sites.map(function (site) {
        return fetch(RAW_BASE + site.slug + ".yml")
          .then(function (res) {
            return res.ok ? res.text() : "";
          })
          .then(function (text) {
            var m = text.match(/startTime:\s*([^\n]+)/);
            if (m) startBySlug[site.slug] = toDateOnly(new Date(m[1].trim()));
          })
          .catch(function () {});
      });

      var issuesBySlug = {};
      var issuesFetch = fetchJson(ISSUES_URL)
        .then(function (issues) {
          var events = issues.map(classifyIssue).filter(Boolean);
          // Single-monitor setup: attribute all events to every site.
          sites.forEach(function (site) {
            issuesBySlug[site.slug] = events;
          });
        })
        .catch(function () {
          // Rate-limited or offline — fall back to an all-green bar.
          sites.forEach(function (site) {
            issuesBySlug[site.slug] = [];
          });
        });

      return Promise.all(startFetches.concat([issuesFetch])).then(function () {
        init(sites, issuesBySlug, startBySlug);
      });
    })
    .catch(function () {
      root.innerHTML = "";
      root.appendChild(el("p", "status-error", "Status data is unavailable right now."));
      rangeLabel.textContent = "";
      prevBtn.disabled = true;
      nextBtn.disabled = true;
    });
})();
