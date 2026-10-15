// The script of a scenario page (simulator spec §7.2), as the text the page carries: the same bytes wherever the page is
// made (Node, a browser, a bundle), so a page is deterministic. It uses nothing from outside its own body — no
// framework, no import, no request — and no template literal, so it can live in this one.

/**
 * `(function (story) { … })`: step through a scenario page. Each step's level is shown and the run marked on it —
 * where it is, the edges the step took and where it came from — playing the step's edges in order when the story
 * moves on by one (simulator spec §7.1: "every fired edge pulses along its path (about 600 ms) while the ring moves
 * from source to target"; with reduced motion, a cross-fade). ← → Home End step through; Present shows the stage
 * layout in full screen, where Space, Page Down and Page Up step too and Esc leaves it. `story`:
 * `{ total, frames: [{ number, input, text, generated, answers, clock, level, trail, run: [{ ids, name }],
 * fired: [{ edge, from, to, initial }] }] }`.
 */
export const PAGE_SCRIPT = String.raw`(function (story) {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var PULSE = 600;
  var LONGEST = 2400;
  var EASE = "cubic-bezier(0.2, 0.7, 0.2, 1)";
  // The ring and the pulse set off and arrive gently, together, by four fifths of the edge's turn.
  var TRAVEL = "cubic-bezier(0.4, 0, 0.2, 1)";
  var ARRIVES = 0.8;
  var body = document.body;
  var figure = document.querySelector(".figure");
  var card = document.querySelector(".card");
  var steps = Array.from(document.querySelectorAll(".step"));
  var frames = story.frames;
  var current = 0;

  function reduced() {
    return Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  function draw(name, attributes, parent) {
    var element = document.createElementNS(NS, name);
    Object.keys(attributes).forEach(function (key) {
      element.setAttribute(key, String(attributes[key]));
    });
    parent.appendChild(element);
    return element;
  }
  function appear(element, delay, duration) {
    if (duration && element.animate) {
      element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: duration, delay: delay, easing: EASE, fill: "backwards" });
    }
    return element;
  }

  // The run's arrowhead in a figure, made once.
  function arrowOf(svg, level) {
    var id = "sw-run-" + level;
    if (!svg.getElementById(id)) {
      var defs = svg.querySelector("defs") || draw("defs", {}, svg);
      var marker = draw("marker", {
        id: id, markerWidth: 9, markerHeight: 7, refX: 8, refY: 3.5, orient: "auto", markerUnits: "userSpaceOnUse"
      }, defs);
      draw("polygon", { points: "0 0, 9 3.5, 0 7", fill: "#0a66c2" }, marker);
    }
    return id;
  }

  // A ring around a box: the selection ring with its halo, a thinner one when the run is inside it, or a dashed one
  // where the run came from.
  function ring(group, box, kind) {
    var b = box.getBBox();
    var round = Math.abs(b.width - b.height) < 2 && b.width < 48;
    function rect(offset, className) {
      return draw("rect", {
        "class": className,
        x: b.x - offset,
        y: b.y - offset,
        width: b.width + 2 * offset,
        height: b.height + 2 * offset,
        rx: round ? b.height / 2 + offset : 10 + offset
      }, group);
    }
    if (kind === "left") return rect(2, "mark-left");
    rect(5, "mark-halo");
    rect(2, kind === "inside" ? "mark-ring inside" : "mark-ring");
    if (kind === "active" && !round) draw("circle", { "class": "mark-dot", cx: b.x + b.width - 8.5, cy: b.y + 8.5, r: 3.5 }, group);
    return b;
  }

  // A pill under a box with the run inside it, naming where (mockup 04).
  function pill(group, box, words) {
    var b = box.getBBox();
    var shape = draw("g", { "class": "mark-pill" }, group);
    var rect = draw("rect", { y: b.y + b.height - 8, height: 22, rx: 11 }, shape);
    var dot = draw("circle", { cy: b.y + b.height + 3, r: 3 }, shape);
    var text = draw("text", { y: b.y + b.height + 7 }, shape);
    text.textContent = words;
    var wide = (text.getComputedTextLength && text.getComputedTextLength()) || words.length * 6.6;
    var left = b.x + b.width / 2 - (wide + 31) / 2;
    rect.setAttribute("x", left);
    rect.setAttribute("width", wide + 31);
    dot.setAttribute("cx", left + 12);
    text.setAttribute("x", left + 21);
    return shape;
  }

  // The label of an edge the step took, as a pill in the run's colour.
  function label(group, element) {
    var b = element.getBBox();
    var shape = draw("g", { "class": "mark-label" }, group);
    draw("rect", { x: b.x - 6, y: b.y - 3, width: b.width + 12, height: b.height + 6, rx: (b.height + 6) / 2 }, shape);
    var text = draw("text", { x: b.x + b.width / 2, y: b.y + b.height / 2 + 3.5, "text-anchor": "middle" }, shape);
    text.textContent = Array.from(element.querySelectorAll("text")).map(function (line) {
      return line.textContent;
    }).join(" ");
    return shape;
  }

  // A ring that moves from one box to another while the edge between them pulses.
  function travel(group, from, to, delay, duration) {
    var a = from.getBBox();
    var b = to.getBBox();
    var rect = draw("rect", {
      "class": "mark-travel", x: a.x - 2, y: a.y - 2, width: a.width + 4, height: a.height + 4, rx: 12, opacity: 0
    }, group);
    var ends = {
      x: [a.x - 2, b.x - 2],
      y: [a.y - 2, b.y - 2],
      width: [a.width + 4, b.width + 4],
      height: [a.height + 4, b.height + 4]
    };
    Object.keys(ends).forEach(function (attribute) {
      var move = draw("animate", {
        attributeName: attribute,
        from: ends[attribute][0],
        to: ends[attribute][1],
        begin: "indefinite",
        dur: duration * ARRIVES + "ms",
        fill: "freeze",
        calcMode: "spline",
        keyTimes: "0;1",
        keySplines: "0.4 0 0.2 1"
      }, rect);
      if (move.beginElementAt) move.beginElementAt(delay / 1000);
    });
    if (rect.animate) {
      rect.animate([{ opacity: 1 }, { opacity: 1, offset: ARRIVES }, { opacity: 0 }], { duration: duration, delay: delay });
    }
  }

  // Mark the run of a frame on its level; animate plays its edges in order.
  function mark(frame, animate) {
    var level = document.querySelector('.level[data-level="' + frame.level + '"]');
    var svg = level.querySelector("svg");
    var scene = svg.querySelector(":scope > g[transform]") || svg;
    Array.from(svg.querySelectorAll(".mark")).forEach(function (old) {
      old.remove();
    });
    Array.from(svg.querySelectorAll(".on")).forEach(function (element) {
      element.classList.remove("on");
    });
    figure.classList.add("run");
    function find(selector, id) {
      return svg.querySelector(selector + '[data-id="' + id + '"]');
    }
    function boxOf(id) {
      return find("g.node", id) || find("g.frame", id);
    }
    function on(element) {
      if (element) element.classList.add("on");
    }
    var marks = draw("g", { "class": "mark", "aria-hidden": "true" }, scene);
    var moving = animate && !reduced();
    var fired = frame.fired.filter(function (item) {
      return find("path", item.edge);
    });
    var each = moving ? Math.min(PULSE, LONGEST / Math.max(fired.length, 1)) : 0;
    var fadeIn = animate ? (moving ? 160 : 250) : 0;
    var arrives = {};

    fired.forEach(function (item, order) {
      var path = find("path", item.edge);
      var at = order * each;
      var text = find("g.label", item.edge);
      on(path);
      on(text);
      var route = draw("path", { "class": "mark mark-fired", d: path.getAttribute("d") }, path.parentNode);
      route.setAttribute("marker-end", "url(#" + arrowOf(svg, frame.level) + ")");
      if (path.getAttribute("stroke-dasharray")) route.setAttribute("stroke-dasharray", path.getAttribute("stroke-dasharray"));
      path.after(route);
      appear(route, at, fadeIn);
      if (text) appear(label(marks, text), at, fadeIn);
      if (moving) {
        var pulse = draw("path", { "class": "mark mark-pulse", d: path.getAttribute("d") }, path.parentNode);
        route.after(pulse);
        var length = route.getTotalLength ? route.getTotalLength() : 0;
        pulse.setAttribute("stroke-dasharray", "28 " + (length + 28));
        if (pulse.animate) {
          pulse.animate([
            { strokeDashoffset: 28, opacity: 0.9, easing: TRAVEL },
            { strokeDashoffset: -length, opacity: 0.9, offset: ARRIVES },
            { strokeDashoffset: -length, opacity: 0.9 }
          ], { duration: each, delay: at });
        }
      }
      var from = boxOf(item.from);
      var to = boxOf(item.to);
      if (from && to && moving && !item.initial) travel(marks, from, to, at, each);
      if (!(item.to in arrives)) arrives[item.to] = at + each;
      var stays = frame.run.some(function (leaf) {
        return leaf.ids.indexOf(item.from) >= 0;
      });
      if (from && !item.initial && !stays) {
        on(from);
        var left = draw("g", {}, marks);
        ring(left, from, "left");
        appear(left, at, fadeIn);
      }
    });

    // Where the run is: each leaf on the deepest box of its path the figure draws; the boxes above it stay in full.
    var tokens = {};
    var inside = {};
    frame.run.forEach(function (leaf) {
      var deepest = -1;
      leaf.ids.forEach(function (id, index) {
        var box = boxOf(id);
        on(box);
        if (box) deepest = index;
      });
      if (deepest < 0) return;
      var id = leaf.ids[deepest];
      if (deepest === leaf.ids.length - 1) tokens[id] = (tokens[id] || 0) + 1;
      else (inside[id] = inside[id] || []).push(leaf.name);
    });
    Object.keys(tokens).forEach(function (id) {
      var group = draw("g", {}, marks);
      var b = ring(group, boxOf(id), "active");
      if (tokens[id] > 1) {
        var badge = draw("g", { "class": "mark-count" }, group);
        draw("rect", { x: b.x + b.width - 7, y: b.y - 11, width: 18, height: 18, rx: 9 }, badge);
        var count = draw("text", { x: b.x + b.width + 2, y: b.y + 1.5, "text-anchor": "middle" }, badge);
        count.textContent = String(tokens[id]);
      }
      appear(group, id in arrives ? arrives[id] : 0, fadeIn);
    });
    Object.keys(inside).forEach(function (id) {
      var group = draw("g", {}, marks);
      var names = inside[id];
      var unique = names.filter(function (name, index) {
        return names.indexOf(name) === index;
      });
      ring(group, boxOf(id), "inside");
      pill(group, boxOf(id), unique.length === 1 ? unique[0] : names.length + " active");
      appear(group, 0, fadeIn);
    });
  }

  function element(tag, text) {
    var made = document.createElement(tag);
    made.textContent = text;
    return made;
  }

  // Show a frame: its step in the story, its level and the levels above it, the stage's card, and the run.
  function show(index, animate) {
    var stops = card.querySelector(".stops");
    if (!frames.length) {
      // A story that cannot even start: its start's card says why.
      card.querySelector(".counter").textContent = "Start";
      stops.textContent = story.stopped || "";
      document.querySelector(".live").textContent = story.stopped || "";
      return;
    }
    current = Math.max(0, Math.min(frames.length - 1, index));
    var frame = frames[current];
    steps.forEach(function (button, at) {
      if (at === current) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
    if (steps[current] && steps[current].scrollIntoView) steps[current].scrollIntoView({ block: "nearest" });
    Array.from(document.querySelectorAll(".level")).forEach(function (level) {
      level.hidden = level.getAttribute("data-level") !== frame.level;
    });
    document.querySelector(".trail").replaceChildren.apply(document.querySelector(".trail"), frame.trail.map(function (name) {
      return element("span", name);
    }));
    card.querySelector(".counter").textContent = frame.number ? frame.number + " / " + story.total : "Start";
    card.querySelector(".pill").textContent = frame.number ? frame.input : "";
    card.querySelector(".clock").textContent = frame.clock;
    var caption = card.querySelector(".caption");
    caption.textContent = frame.text;
    caption.classList.toggle("generated", frame.generated);
    var answers = card.querySelector(".answers");
    answers.replaceChildren.apply(answers, frame.answers.map(function (words) {
      return element("li", words);
    }));
    // At its last frame, a story the design no longer takes to its end says where and why it stops.
    stops.textContent = current === frames.length - 1 && story.stopped ? story.stopped : "";
    Array.from(card.querySelectorAll(".progress span")).forEach(function (segment, at) {
      segment.classList.toggle("done", at <= current);
    });
    Array.from(document.querySelectorAll("[data-go]")).forEach(function (button) {
      var next = current + Number(button.getAttribute("data-go"));
      button.disabled = next < 0 || next >= frames.length;
    });
    document.querySelector(".live").textContent = frame.number ?
      "Step " + frame.number + " of " + story.total + ": " + frame.input + ". " + frame.text :
      "Start. " + frame.text;
    body.style.setProperty("--card", card.offsetHeight + "px");
    mark(frame, Boolean(animate));
  }

  function go(index) {
    show(index, index === current + 1);
  }
  function presenting() {
    return body.classList.contains("presenting");
  }
  function present() {
    body.classList.add("presenting");
    var root = document.documentElement;
    if (root.requestFullscreen) root.requestFullscreen().catch(function () {});
    show(current);
    card.querySelector('[data-go="1"]').focus();
  }
  function leave() {
    if (!presenting()) return;
    body.classList.remove("presenting");
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    show(current);
    document.querySelector(".present").focus();
  }

  steps.forEach(function (button, index) {
    button.addEventListener("click", function () {
      go(index);
    });
  });
  Array.from(document.querySelectorAll("[data-go]")).forEach(function (button) {
    button.addEventListener("click", function () {
      go(current + Number(button.getAttribute("data-go")));
    });
  });
  document.querySelector(".present").addEventListener("click", present);
  document.querySelector(".exit").addEventListener("click", leave);
  document.addEventListener("fullscreenchange", function () {
    if (!document.fullscreenElement) leave();
  });
  document.addEventListener("keydown", function (event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    var stage = presenting();
    if (event.key === "Escape" && stage) return leave();
    // Space on a button is the button's own.
    if (event.key === " " && event.target.closest && event.target.closest("button")) return;
    var keys = { ArrowRight: 1, ArrowLeft: -1 };
    if (stage) {
      keys[" "] = 1;
      keys.PageDown = 1;
      keys.PageUp = -1;
    }
    var target = event.key in keys ? current + keys[event.key] :
      event.key === "Home" ? 0 :
      event.key === "End" ? frames.length - 1 :
      null;
    if (target === null) return;
    event.preventDefault();
    go(target);
  });
  // The figures' texts are measured in their fonts: once those are in, the marks are drawn again where they belong.
  if (document.fonts) document.fonts.ready.then(function () {
    show(current);
  });
  show(0);
})`;
