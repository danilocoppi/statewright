// The script of the documentation page (documentation page spec §5), as the text the page carries: the same bytes
// wherever the page is made, so a page is deterministic. It uses nothing from outside its own body — no framework, no
// import, no request — and no template literal, so it can live in this one. Without it the page reads the same: the
// contents are links, and on narrow screens they stand above the content.

/**
 * `(function () { … })`: the contents mark the part being read (an `IntersectionObserver` watches every part the
 * contents link to; the current one is the last whose top has passed the upper third of the window) with
 * `aria-current`, and keep it in view; on narrow screens, the Contents button opens and closes them.
 */
export const DOCUMENT_PAGE_SCRIPT = String.raw`(function () {
  "use strict";
  var root = document.documentElement;
  var nav = document.getElementById("contents");
  var toggle = document.querySelector(".contents-toggle");
  if (!nav) return;
  root.classList.add("js");

  var links = Array.from(nav.querySelectorAll('a[href^="#"]:not(.brand)'));
  var parts = links
    .map(function (link) {
      return { link: link, target: document.getElementById(decodeURIComponent(link.getAttribute("href").slice(1))) };
    })
    .filter(function (part) {
      return part.target;
    });
  var current = null;

  function line() {
    return Math.min(window.innerHeight / 3, 240);
  }
  function mark() {
    var next = null;
    var bottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    parts.forEach(function (part) {
      var top = part.target.getBoundingClientRect().top;
      if (top <= line() || (bottom && top < window.innerHeight)) next = part;
    });
    if (next === current) return;
    if (current) current.link.removeAttribute("aria-current");
    current = next;
    if (!current) return;
    current.link.setAttribute("aria-current", "true");
    // Keep the mark in view in the contents, without moving the page.
    var link = current.link.getBoundingClientRect();
    var box = nav.getBoundingClientRect();
    if (link.top < box.top + 48) nav.scrollTop -= box.top + 48 - link.top;
    else if (link.bottom > box.bottom - 48) nav.scrollTop += link.bottom - box.bottom + 48;
  }

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(mark, { rootMargin: "0px 0px -66% 0px", threshold: [0, 1] });
    parts.forEach(function (part) {
      observer.observe(part.target);
    });
  }
  window.addEventListener("hashchange", mark);
  mark();

  // Narrow screens: the contents slide over the page from the Contents button.
  function open(value) {
    root.classList.toggle("contents-open", value);
    if (toggle) toggle.setAttribute("aria-expanded", String(value));
  }
  if (toggle)
    toggle.addEventListener("click", function () {
      open(!root.classList.contains("contents-open"));
    });
  nav.addEventListener("click", function (event) {
    if (event.target.closest("a")) open(false);
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && root.classList.contains("contents-open")) {
      open(false);
      if (toggle) toggle.focus();
    }
  });
  document.addEventListener("click", function (event) {
    if (root.classList.contains("contents-open") && !nav.contains(event.target) && event.target !== toggle)
      open(false);
  });
})`;
