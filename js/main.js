(function () {
  "use strict";

  /* ---------- Header + mobile nav ---------- */
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");

  function onScroll() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 24);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function closeNav() {
    if (!toggle || !nav) return;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
    nav.classList.remove("is-open");
  }
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      toggle.setAttribute("aria-label", open ? "Open menu" : "Close menu");
      nav.classList.toggle("is-open", !open);
      if (!open) header.classList.add("is-scrolled");
      else onScroll();
    });
    nav.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", closeNav); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) { closeNav(); toggle.focus(); }
    });
  }

  /* ---------- Mind-map connector lines ---------- */
  var maps = Array.prototype.slice.call(document.querySelectorAll("[data-map]"));
  var SVGNS = "http://www.w3.org/2000/svg";

  function drawLines(map) {
    var svg = map.querySelector(".map-lines");
    var hub = map.querySelector("[data-hub]");
    if (!svg || !hub) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (getComputedStyle(svg).display === "none") return;
    var box = map.getBoundingClientRect();
    var h = hub.getBoundingClientRect();
    var hx = h.left + h.width / 2 - box.left;
    var hy = h.top + h.height / 2 - box.top;
    svg.setAttribute("viewBox", "0 0 " + box.width + " " + box.height);
    map.querySelectorAll(".map-node").forEach(function (node, i) {
      var r = node.getBoundingClientRect();
      var nx = r.left + r.width / 2 - box.left;
      var ny = r.top + r.height / 2 - box.top;
      // gentle curve: control point offset perpendicular to the line
      var mx = (hx + nx) / 2, my = (hy + ny) / 2;
      var dx = nx - hx, dy = ny - hy;
      var bend = (i % 2 ? 1 : -1) * 0.12;
      var cx = mx - dy * bend, cy = my + dx * bend;
      var p = document.createElementNS(SVGNS, "path");
      p.setAttribute("d", "M" + hx + " " + hy + " Q" + cx + " " + cy + " " + nx + " " + ny);
      p.dataset.for = node.getAttribute("data-case");
      svg.appendChild(p);
    });
  }
  function drawAll() { maps.forEach(drawLines); }
  var rto;
  window.addEventListener("resize", function () { clearTimeout(rto); rto = setTimeout(drawAll, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawAll);
  window.addEventListener("load", drawAll);
  drawAll();

  maps.forEach(function (map) {
    function hot(e, on) {
      var btn = e.target.closest && e.target.closest(".map-node");
      if (!btn) return;
      var path = map.querySelector('.map-lines path[data-for="' + btn.getAttribute("data-case") + '"]');
      if (path) path.classList.toggle("is-hot", on);
    }
    map.addEventListener("mouseover", function (e) { hot(e, true); });
    map.addEventListener("mouseout", function (e) { hot(e, false); });
    map.addEventListener("focusin", function (e) { hot(e, true); });
    map.addEventListener("focusout", function (e) { hot(e, false); });
  });

  /* ---------- Case dialog ---------- */
  var dialog = document.getElementById("case-dialog");
  var body = document.getElementById("dialog-body");
  var crumb = document.getElementById("dialog-crumb");
  if (!dialog || !body || typeof dialog.showModal !== "function") {
    // No <dialog> support: show the full case list instead.
    document.documentElement.classList.remove("js");
    return;
  }

  var current = null;      // { article, home, nextSibling, trigger, group }
  var accents = {
    "n-yellow": "#FFE08A", "n-peach": "#FCC9A5", "n-coral": "#FBB4AA",
    "n-pink": "#F9C8D4", "n-blue": "#BCD3FF", "n-cream": "#FFF1D6"
  };

  function nodeColor(btn) {
    for (var k in accents) if (btn.classList.contains(k)) return accents[k];
    return accents["n-yellow"];
  }

  function restoreArticle() {
    if (!current) return;
    if (current.nextSibling) current.home.insertBefore(current.article, current.nextSibling);
    else current.home.appendChild(current.article);
  }

  function openCase(btn, opts) {
    var id = btn.getAttribute("data-case");
    var article = document.getElementById(id);
    if (!article) return;
    var trigger = (opts && opts.trigger) || btn;
    restoreArticle();
    current = { article: article, home: article.parentNode, nextSibling: article.nextSibling, trigger: trigger, btn: btn };
    body.appendChild(article);
    var title = article.querySelector("h3");
    if (title && title.id) dialog.setAttribute("aria-labelledby", title.id);
    var map = btn.closest("[data-map]");
    crumb.textContent = map && map.classList.contains("map-other") ? "Other case · Lab7 Digital" : "Client case study · Tourism & leisure";
    dialog.style.setProperty("--dialog-accent", nodeColor(btn));
    body.scrollTop = 0;
    if (!dialog.open) {
      dialog.showModal();
      document.body.classList.add("dialog-open");
    }
    body.focus({ preventScroll: true });
    if (history.replaceState) history.replaceState(null, "", "#" + id);
  }

  function closeCase() {
    if (dialog.open) dialog.close();
  }

  dialog.addEventListener("close", function () {
    document.body.classList.remove("dialog-open");
    var t = current && current.trigger;
    restoreArticle();
    current = null;
    if (history.replaceState) {
      var sec = t && t.closest("section");
      history.replaceState(null, "", sec && sec.id ? "#" + sec.id : location.pathname + location.search);
    }
    if (t && t.focus) t.focus({ preventScroll: true });
  });

  // Click on backdrop closes
  dialog.addEventListener("click", function (e) {
    if (e.target === dialog) closeCase();
  });
  dialog.querySelector("[data-close]").addEventListener("click", closeCase);

  // Previous / next within the same map
  dialog.querySelectorAll("[data-step]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (!current) return;
      var map = current.btn.closest("[data-map]");
      var nodes = Array.prototype.slice.call(map.querySelectorAll(".map-node"));
      var i = nodes.indexOf(current.btn);
      var step = parseInt(b.getAttribute("data-step"), 10);
      var next = nodes[(i + step + nodes.length) % nodes.length];
      // focus returns to the node for whichever case is showing when closed
      openCase(next, { trigger: next });
    });
  });

  // Focus trap (belt and braces on top of native modal behaviour) + Esc
  dialog.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { e.preventDefault(); closeCase(); return; }
    if (e.key !== "Tab") return;
    var f = Array.prototype.slice.call(dialog.querySelectorAll(
      'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'
    )).filter(function (el) { return el.offsetParent !== null || el === document.activeElement; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === body)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  document.querySelectorAll(".map-node").forEach(function (btn) {
    btn.addEventListener("click", function () { openCase(btn); });
  });

  // Deep link: #case-... or #other-... opens that case
  function fromHash() {
    var id = (location.hash || "").slice(1);
    if (!id) return;
    var btn = document.querySelector('.map-node[data-case="' + id + '"]');
    if (btn) {
      var sec = btn.closest("section");
      if (sec) sec.scrollIntoView();
      openCase(btn);
    }
  }
  fromHash();
})();
