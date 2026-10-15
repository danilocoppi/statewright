# Statewright Editor

The visual builder of the Statewright platform: a static, frontend-only web app over the `statewright` package
(`packages/core`).

## Commands

Run from the repository root (or drop `-w @statewright/editor` inside `apps/editor`).

| Command                                                                       | What it does                                                                                                             |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `npm run dev -w @statewright/editor`                                          | Development server on http://localhost:5173                                                                              |
| `npm test -w @statewright/editor`                                             | Unit and component tests (Vitest)                                                                                        |
| `npm run e2e -w @statewright/editor`                                          | End-to-end tests in Chromium (Playwright; run `npx playwright install chromium` once)                                    |
| `npm run e2e -w @statewright/editor -- e2e/visual.spec.js --update-snapshots` | Redraws the pictures the visual tests compare with, after a deliberate change of look; look at each before committing it |
| `npm run build -w @statewright/editor`                                        | Checks translations, then builds the static site into `apps/editor/dist`                                                 |

## Building and hosting

The build is a static folder: the app, the guide at `/readme` and the files the platform serves beside it —
`/README.md` (the guide as Markdown), `/llms.txt`, `/schema/1.2.json`, `/schema/1.1.json` and `/schema/1.0.json` — all built from
`packages/core`.

Set `VITE_BASE_URL` to the platform's address when building, for example
`VITE_BASE_URL=https://example.com/statewright/ npm run build -w @statewright/editor`: the app is served under its
path, and `/README.md` and `/llms.txt` link to it. Without it, the app is served at the root of its own origin.

Any static host works when every address that is not a file is answered with `index.html` (the app reads the address).
The build writes `_redirects` for Netlify and Cloudflare Pages and `404.html` for GitHub Pages; elsewhere, set the same
rule (nginx: `try_files $uri /index.html;`).

## Where things are

```
src/
  app/          the repository shared by the pages
  canvas/       the canvas: Core's figure of a level on React Flow, its colours, placement, levels, zoom, legend
  catalog/      the catalog sheet: the collections and reusable parts, each item's fields and where it is used
  components/   design primitives (ui/) and shared pieces
  config/       app identity, languages, translation namespaces
  design/       bundled fonts
  editing/      editing on the canvas: tools, placing, connecting, triggers, renaming, the clipboard, the canvas menu
  features/     projects (the Projects screen) and editor (the editor shell)
  files/        import, diff, new projects, saving, exports
  guide/        the platform guide (/readme): Core's README as built by scripts/guide.js, and the ways into it
  i18n/         translations: locales/<language>/<namespace>.json
  inspector/    the inspector: every element's fields in two layers (Basics, Details), their controls, edits as commands
  lib/          small helpers (class names, time, lazy rendering, what is worked out once per document)
  palette/      ⌘K: boxes on any level, catalog items, levels and every command with its keys
  persistence/  IndexedDB repository, autosave, the one-tab lock
  problems/     live Problems: the worker's results, the panel's lines
  reuse/        a box's interior: levels inside, reusable parts made, used and detached
  store/        the document store: dispatch, history, undo, the view of each level
  stores/       interface state: theme, toasts, what the canvas shows
  workers/      the layout worker (auto-layout and SVG, with ELK) and the Problems worker
scripts/        build time: the guide and its files (guide.js), static hosting (hosting.js), the translations check
test/           Vitest (logic in Node; component tests in jsdom)
e2e/            Playwright: journeys, accessibility (axe), the keyboard alone, visual regression (pictures in
                visual.spec.js-snapshots/), a build under a path, and spec §9's budgets (large documents from fixtures/),
                timed last and alone
```

Every change to a document goes through `dispatch` (`src/store/editor.js`), which applies Core commands; the
document is the only truth. Editing on the canvas builds those commands in `src/editing/` (pure functions of the
document, tested in Node) and makes each gesture one undoable change; what Core refuses is said where the gesture
happened. The inspector does the same for every field of format 1.0: `inspector/fields.js` says which fields each
element has and in which layer, checked against Core's schemas by `test/inspector/fields.test.js`, and
`inspector/apply.js` turns an edit into commands. The canvas draws each level with the parts of Core's own figure (`figureOf`), so what it
shows is what `statewright render` exports; ELK runs only in the layout worker, or in the page when that worker
cannot start.
