# AGENTS.md

Instructions for AI agents. Two kinds of work bring you here: using Statewright in another project, with a person, or
working on this repository.

## Using Statewright in another project

Start with the guide's [AI agents: start here](docs/guide/README.md#ai-agents-start-here). It sets up `statewright mcp`
in your client, pairs you with the person's Editor at https://statewright.cpss.com.br, and asks which of three ways the
person wants to work:

- **Map the system they have** — [Map your system, level by level](docs/guide/README.md#map-your-system-level-by-level).
- **Design together** —
  [Design a system with the person, level by level](docs/guide/README.md#design-a-system-with-the-person-level-by-level).
- **Build from a design they have** — the design is the source of truth: implement what it says, and change the design
  with the person first when the code must differ —
  [Build from the design](docs/guide/README.md#build-from-the-design). [The contract](docs/guide/README.md#the-contract)
  (`statewright contract`, `export_contract`) gives its machines, flows and scenarios as JSON for code, and what
  changed since the code was built from it; [Conformance](docs/guide/README.md#conformance) runs its scenarios through
  the code, and `statewright conform` turns what differs into findings on the canvas;
  [The runtime](docs/guide/README.md#the-runtime) (`statewright/runtime`) runs the design itself in JavaScript.

With the MCP server running, `guide_read` gives any section of the guide, offline; without it,
`npx statewright guide <section>` does. Before you change a document, read the
[Rules for AI agents](docs/guide/README.md#rules-for-ai-agents). The ones that matter most:

- Change documents only through commands (`batch_apply`, `statewright apply`); never edit the JSON by hand.
- IDs are permanent; declare events, endpoints and parties in the catalog and reference them by ID.
- Do not invent: mark what you are unsure of, and leave unknown fields unspecified.
- Build top-down, about a dozen boxes per level, and confirm each level with the person before going deeper.
- After every batch, read `problems_list` and fix the errors; show the person what you changed with `view_point`.

## Working on this repository

The repository is https://github.com/danilocoppi/statewright; its issues are where problems are reported.

Statewright is an npm workspace: [packages/core](packages/core) is `statewright` on npm (the format, commands, rules,
layout, rendering, simulation, the agent contract, the MCP server and the CLI), and [apps/editor](apps/editor) is the
Editor, a static React app over it.

| Path                         | What it holds                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| `packages/core/src/schema`   | The format: Zod schemas, from which `packages/core/schema/1.2.json` is built                      |
| `packages/core/src/commands` | The document commands (`node.add`, `edge.add`, …) that every change goes through                  |
| `packages/core/src/rules`    | The rules behind the Problems                                                                     |
| `packages/core/src/layout`   | The automatic layout (ELK) and its geometry                                                       |
| `packages/core/src/render`   | SVG figures and scenario pages                                                                    |
| `packages/core/src/simulate` | The simulation engine: pure, sessions as plain JSON                                               |
| `packages/core/src/agent`    | The agent contract (`statewright/agent`) and the file host                                        |
| `packages/core/src/mcp`      | The MCP server, the bridge to the Editor and the guide's sections (Node only)                     |
| `packages/core/src/cli`      | The `statewright` command (Node only)                                                             |
| `apps/editor/src`            | The Editor: `canvas`, `inspector`, `simulate`, `agent` (`window.statewright`, pairing), `i18n`, … |
| `apps/editor/e2e`            | End-to-end, accessibility and visual tests (Playwright)                                           |

### Commands

Run them from the repository's root.

| Command                                     | What it does                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `npm ci`                                    | Installs the workspace                                                                      |
| `npm test`                                  | Core's tests, then the Editor's (Vitest)                                                    |
| `npm test -w statewright`                   | Core's tests only                                                                           |
| `npm test -w @statewright/editor`           | The Editor's tests only                                                                     |
| `npm run e2e`                               | The Editor end to end, on its production build (run `npx playwright install chromium` once) |
| `npm run budgets -w statewright`            | The MCP server's start budget                                                               |
| `npm run lint`                              | ESLint                                                                                      |
| `npm run format:check`                      | Prettier, checking; `npm run format` rewrites                                               |
| `npm run i18n:check -w @statewright/editor` | The Editor's words have the same keys in en, pt-BR and es                                   |
| `npm run readme:build`                      | Builds `packages/core/README.md` from `docs/guide/README.md`                                |
| `npm run examples:normalize`                | Writes the examples in canonical form and signs them                                        |
| `npm run examples:render`                   | Renders the examples into `examples/rendered/`                                              |
| `npm run build:schema -w statewright`       | Builds `packages/core/schema/1.2.json` from the schemas                                     |
| `npm run editor:dev`                        | The Editor on http://localhost:5173                                                         |
| `npm run editor:build`                      | Builds the Editor into `apps/editor/dist`                                                   |

Before you say a change is done: `npm test`, `npm run lint`, `npm run format:check` and
`npm run i18n:check -w @statewright/editor` pass, and `npm run e2e` too when the Editor changed.

### Conventions

- JavaScript with JSDoc, ES modules; no TypeScript sources.
- English in code, comments, documents and commit messages. The Editor's words live in
  `apps/editor/src/i18n/locales/{en,pt-BR,es}`, with the same keys in all three.
- Prettier with print width 120, double quotes and no trailing commas: run it from the root only. Run inside a
  workspace, it misses the root's `.prettierignore` and rewrites files whose exact bytes are tested.
- Tests first: every change comes with a test you saw fail before the change and pass after it.
- Core runs in browsers too: code that needs Node (`node:fs`, `node:http`) lives under `src/cli` or `src/mcp`.
- The Editor keeps its visual system (the Editor spec, §5) and its `data-testid` hooks, which the guide lists.
- No new dependency without a reason written in a spec.

### Generated files

Never edit these by hand; change their source and run the command.

| File                            | Source, and the command that builds it                                                  |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| `packages/core/README.md`       | `docs/guide/README.md` and the code behind its generated blocks: `npm run readme:build` |
| `examples/rendered/`            | `examples/*.sttw`: `npm run examples:render`                                            |
| `packages/core/schema/1.2.json` | `packages/core/src/schema`: `npm run build:schema -w statewright`                       |
| `examples/*.sttw`               | Signed documents: change them through commands, then `npm run examples:normalize`       |

### How work is done here

Every change is written test first: the test that pins it fails, then the code makes it pass, then the whole suite,
lint and format run green before it is committed. Behaviour that people see has an end-to-end test, and a change of
look updates the visual snapshots on purpose, after looking at each one.
