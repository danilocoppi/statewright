import { CATALOG_COLLECTIONS, FORMAT_VERSION, ID_PREFIXES } from "../constants.js";
import { buildIndex } from "../query/build-index.js";
import { hierarchy } from "../query/index.js";
import { check } from "../rules/index.js";
import { triggersOf } from "../rules/facts.js";
import { associationsOf } from "../roles/index.js";
import { edgeHome, isGuest } from "../roles/kinds.js";
import { createStyle, stepText } from "../style/index.js";

const sortedKeys = map => Object.keys(map ?? {}).sort();
const cell = value =>
  String(value ?? "")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");
const table = (headers, rows) =>
  rows.length ?
    [
      `| ${headers.join(" | ")} |`,
      `| ${headers.map(() => "---").join(" | ")} |`,
      ...rows.map(row => `| ${row.map(cell).join(" | ")} |`)
    ].join("\n")
  : "";
const code = value => (value === undefined || value === null || value === "" ? "" : `\`${value}\``);

/** Canvases in reading order: depth-first from the root, then catalog implementations, then definition bodies. */
function walk(doc) {
  const trees = hierarchy(doc);
  const out = [];
  const seen = new Set();
  const visit = (tree, path) => {
    if (seen.has(tree.canvas) || !doc.canvases[tree.canvas]) return;
    seen.add(tree.canvas);
    const here = [...path, tree.canvas];
    out.push({ canvas: tree.canvas, path: here, via: tree.via, definition: tree.definition });
    for (const child of tree.children) visit(child, here);
  };
  for (const tree of [trees.root, ...trees.catalog, ...trees.definitions]) visit(tree, []);
  for (const id of sortedKeys(doc.canvases))
    if (!seen.has(id)) out.push({ canvas: id, path: [id], via: null, definition: null });
  return out;
}

/** Display name of any element. */
function nameOf(doc, index, id) {
  const entry = index.get(id);
  const value = entry?.value;
  // A guest is named by what it stands for (mixed levels spec §4).
  if (entry?.type === "node" && isGuest(doc.canvases[entry.canvas].kind, value))
    return value.label ?? stepText(doc, value);
  return value?.label ?? value?.name ?? value?.code ?? value?.title ?? id;
}

/** How the AI pack says a role (mixed levels spec §3). */
const ROLE_PHRASES = {
  sends: "sends",
  receives: "is for",
  runs: "runs",
  drives: "drives",
  leadsTo: "leads to",
  performs: "is done by"
};

/** Effects (spec §9.5) as short text: `action Refresh quote`, `emit expiry.elapsed`, `assign context.x`. */
function effectsText(effects, named) {
  return (effects ?? [])
    .map(effect =>
      effect.action ? `action ${named(effect.action)}`
      : effect.emit ? `emit ${named(effect.emit)}`
      : `assign ${Object.keys(effect.assign ?? {}).join(", ")}`
    )
    .join("; ");
}

/** Guard text: the guard's name, the plain-language text, or "expression". */
function guardText(condition, named) {
  if (!condition) return "";
  if (condition.guard) return named(condition.guard);
  return condition.text ?? "expression";
}

/** The scenarios that run a canvas, in ID order. */
const scenariosOf = (doc, canvasId) =>
  sortedKeys(doc.annotations?.scenarios)
    .map(id => [id, doc.annotations.scenarios[id]])
    .filter(([, scenario]) => scenario.canvas === canvasId);

/** A scenario step's input in words: the event's name, the call, or the time waited. */
function inputText(doc, named, input) {
  if (input.event) return named(input.event);
  if (input.call) {
    const endpoint = doc.catalog.endpoints[input.call];
    return endpoint ? `${endpoint.method} ${endpoint.path}` : named(input.call);
  }
  return input.wait === "next" ? "wait for the next timer" : `wait ${input.wait}`;
}

/** The catalog's tables: their headers and, per item, its cells (spec §23). */
const CATALOG_HEADERS = {
  types: ["Type", "Kind", "Description"],
  events: ["Event", "Payload", "Source", "Description"],
  actions: ["Action", "Input", "Output", "Description"],
  guards: ["Guard", "Expression", "Description"],
  endpoints: ["Endpoint", "Request", "Auth", "Description"],
  webhooks: ["Webhook", "Direction", "Party", "Description"],
  timers: ["Timer", "When", "Calendar", "Description"],
  statuses: ["Status", "Tone", "Description"],
  parties: ["Party", "Kind", "Description"]
};

/**
 * A table cell: its text, and the elements it names (`{ id, text }`) in the order its text says them, so a page can
 * link and chip them. A name the text does not say (an edge with its own label) is left out.
 */
function cellOf(value, refs = []) {
  const text = String(value ?? "");
  const found = [];
  let from = 0;
  for (const ref of refs) {
    const at = ref.text ? text.indexOf(ref.text, from) : -1;
    if (at < 0) continue;
    found.push(ref);
    from = at + ref.text.length;
  }
  return { text, refs: found };
}

/**
 * A cell in parts: plain text and the elements it names, in order.
 * @param {{ text: string, refs: Array<{ id: string, text: string }> }} cell
 * @returns {Array<string | { id: string, text: string }>}
 */
export function cellParts(cell) {
  const parts = [];
  let from = 0;
  for (const ref of cell.refs) {
    const at = cell.text.indexOf(ref.text, from);
    if (at < 0) continue;
    if (at > from) parts.push(cell.text.slice(from, at));
    parts.push(ref);
    from = at + ref.text.length;
  }
  if (from < cell.text.length) parts.push(cell.text.slice(from));
  return parts;
}

/** A finding's evidence in words: `file.js:34-52` for code, the title (or address) of a document. */
const evidenceOf = item =>
  item.kind === "code" ?
    { text: `${item.path}${item.lines ? `:${item.lines}` : ""}` }
  : { text: item.title ?? item.url, url: item.url };

/**
 * What the documentation says about a design (spec §23), shared by the Markdown and the page so they never differ:
 * the project and its numbers, the levels in reading order (depth-first from the root) with their tables, scenarios
 * and findings, the catalog's tables, and the findings. Table cells are `{ text, refs }` (see `cellParts`).
 * @param {any} doc A valid document.
 */
export function documentModel(doc) {
  const index = buildIndex(doc);
  const style = createStyle(doc);
  const named = id => nameOf(doc, index, id);
  const ref = id => (id ? { id, text: named(id) } : null);
  const refs = ids => ids.filter(Boolean).map(ref);
  const eventName = id => doc.catalog.events[id]?.name ?? id;
  const viaName = id => {
    const endpoint = doc.catalog.endpoints[id];
    return endpoint ? `${endpoint.method} ${endpoint.path}` : (doc.catalog.webhooks[id]?.name ?? id);
  };

  const catalogRows = {
    types: item => [cellOf(item.name), cellOf(item.kind), cellOf(item.description)],
    events: item => [
      cellOf(item.name),
      cellOf(
        item.payload === null ? "none"
        : item.payload ? named(item.payload)
        : "",
        refs([item.payload])
      ),
      cellOf(
        item.source ?
          item.source === "internal" ?
            "internal"
          : named(item.source)
        : "",
        item.source && item.source !== "internal" ? refs([item.source]) : []
      ),
      cellOf(item.description)
    ],
    actions: item => [
      cellOf(item.name),
      cellOf(item.input ? named(item.input) : "", refs([item.input])),
      cellOf(item.output ? named(item.output) : "", refs([item.output])),
      cellOf(item.description)
    ],
    guards: item => [cellOf(item.name), cellOf(item.expr === undefined ? "" : "expression"), cellOf(item.description)],
    endpoints: item => [
      cellOf(item.name),
      cellOf(`${item.method} ${item.path}`),
      cellOf(item.auth),
      cellOf(item.description)
    ],
    webhooks: item => [
      cellOf(item.name),
      cellOf(item.direction),
      cellOf(item.party ? named(item.party) : "", refs([item.party])),
      cellOf(item.description)
    ],
    timers: item => [
      cellOf(item.name),
      cellOf(item.duration ?? (item.at ? `${item.at}${item.offset ? ` ${item.offset}` : ""}` : "")),
      cellOf(item.calendar),
      cellOf(item.description)
    ],
    statuses: item => [cellOf(item.name), cellOf(item.tone), cellOf(item.description)],
    parties: item => [cellOf(item.name), cellOf(item.kind), cellOf(item.description)]
  };
  const catalog = Object.keys(CATALOG_COLLECTIONS)
    .filter(collection => sortedKeys(doc.catalog[collection]).length)
    .map(collection => ({
      collection,
      title: `${collection[0].toUpperCase()}${collection.slice(1)}`,
      headers: CATALOG_HEADERS[collection],
      rows: sortedKeys(doc.catalog[collection]).map(id => ({
        id,
        cells: catalogRows[collection](doc.catalog[collection][id])
      }))
    }));

  const findingIds = sortedKeys(doc.annotations?.findings);
  const canvasOf = id => {
    const entry = index.get(id);
    return entry?.type === "canvas" ? id : (entry?.canvas ?? null);
  };
  const findings = findingIds.map(id => {
    const finding = doc.annotations.findings[id];
    return {
      id,
      code: finding.code,
      severity: finding.severity,
      title: finding.title,
      description: finding.description ?? "",
      source: finding.source ?? "",
      targets: finding.targets.map(target => ({ id: target, name: named(target), canvasId: canvasOf(target) })),
      evidence: (finding.evidence ?? []).map(evidenceOf)
    };
  });

  const levels = walk(doc).map(({ canvas: id, path }) => {
    const canvas = doc.canvases[id];
    const machine = canvas.kind === "machine";
    const nodeIds = sortedKeys(canvas.nodes);
    const nodes =
      machine ?
        {
          headers: ["State", "Statuses", "Outcome", "Notes"],
          rows: nodeIds
            .filter(nodeId => canvas.nodes[nodeId].kind === "state")
            .map(nodeId => {
              const node = canvas.nodes[nodeId];
              const interior = node.inner ? style.node(nodeId).interior : null;
              return {
                id: nodeId,
                cells: [
                  cellOf(node.label ?? node.name),
                  cellOf((node.statuses ?? []).map(named).join(", "), refs(node.statuses ?? [])),
                  cellOf([node.outcome, node.terminal ? "terminal" : null].filter(Boolean).join(", ")),
                  cellOf(
                    [node.summary, node.inner ? `enters ${named(interior ?? "")}` : null, node.provenance]
                      .filter(Boolean)
                      .join(" · "),
                    refs([interior])
                  )
                ]
              };
            })
        }
      : {
          headers: ["Element", "Kind", "Notes"],
          rows: nodeIds.map(nodeId => {
            const node = canvas.nodes[nodeId];
            const name = node.label ?? node.name ?? (isGuest(canvas.kind, node) ? stepText(doc, node) : nodeId);
            const interior = style.node(nodeId).interior;
            return {
              id: nodeId,
              cells: [
                cellOf(name, interior ? [{ id: interior, text: name }] : []),
                cellOf(node.kind),
                cellOf([node.summary, node.provenance].filter(Boolean).join(" · "))
              ]
            };
          })
        };
    const edgeIds = sortedKeys(canvas.edges);
    const end = nodeId => {
      const node = canvas.nodes[nodeId];
      if (node && isGuest(canvas.kind, node)) return node.label ?? stepText(doc, node);
      return node?.label ?? node?.name ?? node?.kind ?? nodeId;
    };
    const edges =
      machine || canvas.kind === "mixed" ?
        {
          headers: ["From", "To", "Trigger", "Guard", "Effects"],
          rows: edgeIds.map(edgeId => {
            const edge = canvas.edges[edgeId];
            const triggers = [
              ...(edge.on ?? []).map(eventId => ({ id: eventId, text: eventName(eventId) })),
              ...(edge.after ? [{ id: edge.after, text: doc.catalog.timers[edge.after]?.name ?? edge.after }] : []),
              ...(edge.via ? [{ id: edge.via, text: viaName(edge.via) }] : [])
            ];
            const effects = (edge.actions ?? []).map(effect => effect.action ?? effect.emit);
            return {
              id: edgeId,
              cells: [
                cellOf(end(edge.from)),
                cellOf(end(edge.to)),
                cellOf(style.edgeLabel(edgeId).replace(/ \[[^\]]*\]$/, ""), triggers),
                cellOf(guardText(edge.guard, named), refs([edge.guard?.guard])),
                cellOf(effectsText(edge.actions, named), refs(effects))
              ]
            };
          })
        }
      : {
          headers: ["From", "To", "What"],
          rows: edgeIds.map(edgeId => {
            const edge = canvas.edges[edgeId];
            const names = [
              ...(edge.events ?? []).map(eventId => ({ id: eventId, text: eventName(eventId) })),
              ...[edge.endpoint, edge.webhook].filter(Boolean).map(via => ({ id: via, text: viaName(via) }))
            ];
            return {
              id: edgeId,
              cells: [cellOf(end(edge.from)), cellOf(end(edge.to)), cellOf(style.edgeLabel(edgeId), names)]
            };
          })
        };
    // The roles' connectors whose ends are both on this level (mixed levels spec §7), when it has any.
    const ROLE_WORDS = {
      sends: "sends",
      receives: "is for",
      runs: "runs",
      drives: "drives",
      leadsTo: "leads to",
      performs: "is done by"
    };
    const endText = elementId => (canvas.nodes[elementId] ? end(elementId) : style.edgeLabel(elementId) || elementId);
    const roleRows = associationsOf(doc, id)
      // A connector belongs to the level of an end it touches (a lifecycle's drivers to the system that frames it).
      .filter(item => [item.from, item.to].some(elementId => canvas.nodes[elementId] || canvas.edges[elementId]))
      .map(item => ({
        id: item.id,
        cells: [
          cellOf(endText(item.from)),
          cellOf(ROLE_WORDS[item.role]),
          cellOf(endText(item.to)),
          cellOf(
            item.label ?? "",
            item.owners
              .filter(owner => !canvas.edges[owner] && !canvas.nodes[owner])
              .map(owner => ({ id: owner, text: named(owner) }))
          )
        ]
      }));
    const roles = roleRows.length ? { headers: ["From", "Role", "To", "About"], rows: roleRows } : null;
    return {
      id,
      path: path.map(named),
      pathIds: path,
      depth: path.length - 1,
      kind: canvas.kind,
      stage: canvas.stage ?? null,
      subject: machine && canvas.subject ? canvas.subject : null,
      transitions: machine ? (canvas.transitions ?? "partial") : null,
      title: canvas.title ?? "",
      caption: canvas.caption ?? "",
      nodes,
      edges,
      roles,
      scenarios: scenariosOf(doc, id).map(([scenarioId, scenario]) => ({
        id: scenarioId,
        name: scenario.name,
        description: scenario.description ?? "",
        start: { at: scenario.start.at, entry: scenario.start.entry ? named(scenario.start.entry) : null },
        steps: scenario.steps.map(item => ({ input: inputText(doc, named, item.do), caption: item.caption ?? "" }))
      })),
      findings: findings
        .filter(finding => finding.targets.some(target => target.canvasId === id))
        .map(finding => finding.id)
    };
  });

  const canvases = Object.values(doc.canvases);
  const machines = canvases.filter(canvas => canvas.kind === "machine");
  return {
    project: {
      name: doc.project.name,
      description: doc.project.description ?? "",
      stage: doc.canvases[doc.root]?.stage ?? null,
      rootKind: doc.canvases[doc.root]?.kind ?? null
    },
    counts: {
      levels: Object.fromEntries(
        ["system", "machine", "flow", "mixed"].map(kind => [
          kind,
          canvases.filter(canvas => canvas.kind === kind).length
        ])
      ),
      states: machines.reduce(
        (sum, canvas) => sum + Object.values(canvas.nodes).filter(node => node.kind === "state").length,
        0
      ),
      transitions: machines.reduce((sum, canvas) => sum + Object.keys(canvas.edges).length, 0),
      scenarios: sortedKeys(doc.annotations?.scenarios).length,
      findings: findings.length,
      severe: findings.filter(finding => finding.severity === "high" || finding.severity === "critical").length
    },
    levels,
    catalog,
    findings
  };
}

/**
 * Markdown for people (spec §23): the project, catalog tables, then one section per canvas in depth-first order (with
 * its breadcrumb), with state and transition tables and the scenarios that run it, and the findings.
 * @param {any} doc A valid document.
 * @returns {string}
 */
export function toMarkdown(doc) {
  const model = documentModel(doc);
  const texts = rows => rows.map(row => row.cells.map(item => item.text));
  const out = [`# ${model.project.name}`, ""];
  if (model.project.description) out.push(model.project.description, "");

  if (model.catalog.length) {
    out.push("## Catalog", "");
    for (const collection of model.catalog)
      out.push(`### ${collection.title}`, "", table(collection.headers, texts(collection.rows)), "");
  }

  for (const level of model.levels) {
    out.push(`## ${level.path.join(" › ")}`, "");
    const facts = [
      level.kind,
      level.stage,
      level.subject ? `subject \`${level.subject}\`` : null,
      level.transitions ? `transitions ${level.transitions}` : null
    ].filter(Boolean);
    out.push(`*${facts.join(" · ")}*`, "");
    if (level.title) out.push(`**${level.title}**`, "");
    if (level.caption) out.push(level.caption, "");
    out.push(table(level.nodes.headers, texts(level.nodes.rows)), "");
    out.push(table(level.edges.headers, texts(level.edges.rows)), "");
    if (level.roles) out.push(table(level.roles.headers, texts(level.roles.rows)), "");
    for (const scenario of level.scenarios) {
      out.push(`### Scenario: ${scenario.name}`, "");
      if (scenario.description) out.push(scenario.description, "");
      out.push(`Starts ${scenario.start.at}${scenario.start.entry ? ` at ${scenario.start.entry}` : ""}.`, "");
      const steps = scenario.steps.map(
        (item, index) => `${index + 1}. ${item.input}${item.caption ? ` — ${item.caption}` : ""}`
      );
      if (steps.length) out.push(steps.join("\n"), "");
    }
  }

  if (model.findings.length) {
    out.push(
      "## Findings",
      "",
      table(
        ["Code", "Severity", "Finding", "On"],
        model.findings.map(finding => [
          finding.code,
          finding.severity,
          finding.title,
          finding.targets.map(target => target.name).join(", ")
        ])
      ),
      ""
    );
  }
  return `${out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd()}\n`;
}

/**
 * One Markdown document for language models (spec §23): a preamble that points to the guide, an ID → name glossary,
 * the levels with IDs, one flat transition table per canvas (IDs, triggers, guards, effects), completeness levels,
 * findings, the scenarios (inputs, answers and recorded paths) and the current Problems. Everything is sorted by ID so
 * diffs between versions stay small.
 * @param {any} doc A valid document.
 * @param {{ guideUrl?: string }} [options] Where the Statewright guide lives (default: `npx statewright guide`).
 * @returns {string}
 */
export function toAIPack(doc, { guideUrl } = {}) {
  const index = buildIndex(doc);
  const named = id => nameOf(doc, index, id);
  const guide = guideUrl ? `<${guideUrl}>` : "`npx statewright guide`";
  const out = [
    `# ${doc.project.name} — Statewright AI pack`,
    "",
    `This is a generated summary of the Statewright document \`${doc.project.id}\` (format ${FORMAT_VERSION}). ` +
      `Read the Statewright guide (${guide}) before changing it, change it only through commands ` +
      "(`statewright apply`), and reference elements by the IDs below.",
    ""
  ];

  const singular = collection =>
    Object.keys(ID_PREFIXES).find(name => ID_PREFIXES[name] === CATALOG_COLLECTIONS[collection]);
  const kindOf = entry =>
    entry.type === "catalog" ? singular(entry.collection)
    : entry.type === "node" ? `${entry.value.kind} node`
    : entry.type;
  out.push(
    "## Glossary",
    "",
    table(
      ["ID", "Kind", "Name", "Where"],
      [...index.entries.values()]
        .filter(entry => entry.type !== "edge")
        .sort((a, b) =>
          a.id < b.id ? -1
          : a.id > b.id ? 1
          : 0
        )
        .map(entry => [code(entry.id), kindOf(entry), named(entry.id), entry.canvas ? code(entry.canvas) : ""])
    ),
    ""
  );

  const trees = hierarchy(doc);
  const lines = [];
  const tree = (node, depth) => {
    const canvas = doc.canvases[node.canvas];
    const steps = [node.via, node.definition, node.canvas].filter(Boolean).map(code).join(" → ");
    lines.push(
      `${"  ".repeat(depth)}- ${steps} ${canvas ? `"${canvas.name}" [${canvas.kind}]` : "(missing)"}${node.cycle ? " (cycle)" : ""}`
    );
    for (const child of node.children) tree(child, depth + 1);
  };
  tree(trees.root, 0);
  for (const node of [...trees.catalog, ...trees.definitions]) tree(node, 0);
  out.push("## Levels", "", ...lines, "");

  out.push("## Canvases", "");
  for (const id of sortedKeys(doc.canvases)) {
    const canvas = doc.canvases[id];
    const about = [
      canvas.kind,
      canvas.stage ? `stage ${canvas.stage}` : null,
      canvas.kind === "machine" ? `transitions ${canvas.transitions ?? "partial"}` : null,
      canvas.kind === "machine" && canvas.subject ? `subject ${canvas.subject}` : null
    ].filter(Boolean);
    out.push(`### ${code(id)} "${canvas.name}"`, "", `${about.join(" · ")}`, "");
    const edges = sortedKeys(canvas.edges);
    // A connector belongs to the level of an end it touches (a lifecycle's drivers to the system that frames it).
    const roles = associationsOf(doc, id).filter(item =>
      [item.from, item.to].some(end => canvas.nodes[end] || canvas.edges[end])
    );
    if (roles.length) {
      out.push(
        "Roles (derived; change the field that holds them):",
        "",
        ...roles.map(
          item =>
            `- ${code(item.from)} ${ROLE_PHRASES[item.role]} ${code(item.to)} — ${item.owners.map(owner => `${code(item.field)} of ${code(owner)}`).join(", ")}`
        ),
        ""
      );
    }
    if (!edges.length) {
      out.push("No edges.", "");
      continue;
    }
    // A mixed level's connections are listed as a machine's transitions are: its other connections by their kind.
    if (canvas.kind === "machine" || canvas.kind === "mixed") {
      out.push(
        table(
          ["Edge", "From", "To", "Triggers", "Guard", "Effects"],
          edges.map(edgeId => {
            const edge = canvas.edges[edgeId];
            const guard =
              edge.guard?.guard ??
              (edge.guard?.text ? `"${edge.guard.text}"`
              : edge.guard ? "expression"
              : "");
            const effects = (edge.actions ?? []).map(effect =>
              effect.action ? `action:${effect.action}`
              : effect.emit ? `emit:${effect.emit}`
              : `assign:${Object.keys(effect.assign).join(",")}`
            );
            return [
              code(edgeId),
              code(edge.from),
              code(edge.to),
              edge.kind === "link" ? "link"
              : canvas.kind === "mixed" && edgeHome(canvas, edge) !== "machine" ? (edge.kind ?? edgeHome(canvas, edge))
              : triggersOf(edge).join(" ") || "(none)",
              guard,
              effects.join(" ")
            ];
          })
        ),
        ""
      );
    } else {
      out.push(
        table(
          ["Edge", "From", "To", "Kind", "References"],
          edges.map(edgeId => {
            const edge = canvas.edges[edgeId];
            const references = [...(edge.events ?? []), edge.endpoint, edge.webhook, edge.by].filter(Boolean);
            const kind = edge.kind === "case" ? `case ${JSON.stringify(edge.case)}` : (edge.kind ?? "");
            return [code(edgeId), code(edge.from), code(edge.to), kind, references.join(" ")];
          })
        ),
        ""
      );
    }
  }

  const findings = sortedKeys(doc.annotations?.findings);
  out.push(
    "## Findings",
    "",
    findings.length ?
      table(
        ["ID", "Code", "Severity", "Targets", "Title", "Source"],
        findings.map(id => {
          const finding = doc.annotations.findings[id];
          return [
            code(id),
            finding.code,
            finding.severity,
            finding.targets.map(code).join(" "),
            finding.title,
            finding.source ?? ""
          ];
        })
      )
    : "None.",
    ""
  );
  const scenarios = sortedKeys(doc.annotations?.scenarios);
  out.push("## Scenarios", "");
  if (!scenarios.length) out.push("None.", "");
  for (const id of scenarios) {
    const scenario = doc.annotations.scenarios[id];
    const answers = list =>
      (list ?? []).map(answer => code(`${answer.kind}@${answer.at}=${JSON.stringify(answer.value)}`)).join(" ");
    const start = [
      `start ${scenario.start.at}`,
      scenario.start.entry ? `entry ${code(scenario.start.entry)}` : null,
      scenario.start.context ? `context ${code(JSON.stringify(scenario.start.context))}` : null,
      scenario.start.input !== undefined ? `input ${code(JSON.stringify(scenario.start.input))}` : null,
      scenario.start.answers?.length ? `answers ${answers(scenario.start.answers)}` : null
    ].filter(Boolean);
    const input = item => {
      const what =
        item.event ? `event:${item.event}`
        : item.call ? `call:${item.call}`
        : `wait:${item.wait}`;
      return item.payload === undefined ? code(what) : `${code(what)} payload ${code(JSON.stringify(item.payload))}`;
    };
    out.push(
      `### ${code(id)} "${scenario.name}" on ${code(scenario.canvas)}`,
      "",
      start.join(" · "),
      "",
      table(
        ["Step", "Input", "Answers", "Reached"],
        scenario.steps.map((item, index) => [
          String(index + 1),
          input(item.do),
          answers(item.answers),
          [...item.reached.active.map(code), item.reached.ended ? `ended ${item.reached.ended}` : null]
            .filter(Boolean)
            .join(" ")
        ])
      ),
      ""
    );
  }
  const problems = check(doc);
  out.push(
    "## Problems",
    "",
    problems.length ?
      table(
        ["Severity", "Code", "Target", "Message"],
        problems.map(problem => [problem.severity, code(problem.code), code(problem.target), problem.message])
      )
    : "None.",
    ""
  );
  return `${out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd()}\n`;
}
