# Statewright

Statewright is a builder for **layered specifications of systems**: architecture views, state machines and procedural
flows, nested to any depth, stored as one signed JSON document (`*.statewright.json`). It is made to be worked on with
**AI coding agents** — Claude Code, Codex, Kimi, Cursor and others — beside a visual Editor where the person sees every
change an agent makes, and can undo it.

- **The Editor:** https://statewright.cpss.com.br
- **The library and the command line:** `npm install statewright`, or `npx statewright --help` without installing.
- **The guide:** [docs/guide/README.md](docs/guide/README.md), also the npm package's README and
  https://statewright.cpss.com.br/readme.
- **The source:** https://github.com/danilocoppi/statewright, where problems and ideas go to its
  [issues](https://github.com/danilocoppi/statewright/issues).

**AI agents: read [AGENTS.md](AGENTS.md).**

## Working with an AI agent

Set up the MCP server in your agent — in Claude Code, `claude mcp add statewright -- npx statewright mcp`; the guide's
[AI agents: start here](docs/guide/README.md#ai-agents-start-here) gives the command for other clients. Open a project
in the Editor, choose **Connect an AI…** and give your agent the code it shows. Then work in one of three ways:

1. **Map the system you have.** The agent reads your code and draws what it does, level by level: every element cites
   the file and the lines it came from, and the defects it finds become findings you can see on the canvas —
   [Map your system, level by level](docs/guide/README.md#map-your-system-level-by-level).
2. **Design together.** The agent interviews you and builds the design top-down, level 0 first, then one level per box
   that needs detail — [Design a system with the person, level by level](docs/guide/README.md#design-a-system-with-the-person-level-by-level).
   [examples/bookings.statewright.json](examples/bookings.statewright.json) is that playbook's design.
3. **Build from the design.** Keep the `.statewright.json` in your repository as the source of truth: the agent
   implements what it says, and when the code must differ it changes the design with you first.
   `statewright contract` writes the design's machines, flows and scenarios as JSON for code
   ([The contract](docs/guide/README.md#the-contract)), and `--check` in CI says when the design has changed and the
   code may not have followed. Your tests run the scenarios through the code, and
   `statewright conform` turns what differs into findings on the canvas —
   [Build from the design](docs/guide/README.md#build-from-the-design). In JavaScript, the system can also run the
   design itself: [The runtime](docs/guide/README.md#the-runtime).

## The repository

| Path                                         | What it holds                                                                                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [packages/core](packages/core)               | `statewright` on npm: the format, commands, rules, layout, rendering, simulation, the agent contract, the MCP server and the CLI |
| [apps/editor](apps/editor)                   | The Editor (React), published at https://statewright.cpss.com.br                                                                 |
| [docs/guide/README.md](docs/guide/README.md) | The guide, built into `packages/core/README.md`                                                                                  |
| [examples](examples)                         | Example documents, and what Statewright renders of them (`examples/rendered/`)                                                   |

## Developing

Node.js 22.12 or newer.

```sh
npm ci
npm test            # Core, then the Editor
npm run e2e         # the Editor end to end, on its production build (Playwright)
npm run editor:dev  # the Editor on http://localhost:5173
```

[AGENTS.md](AGENTS.md) lists every command, the conventions and the files that are generated.

## Support the project

Statewright is free and open source. If it helps you, a donation keeps it going — send only on these networks:

| Network                   | Address                                        |
| ------------------------- | ---------------------------------------------- |
| Solana                    | `DCA31TRz39qmKPseSRMjANN7cGYoWGUbtkC582oMRyWy` |
| ETH · BSC · Polygon (EVM) | `0x54636195948915f091466f027025973328813a3a`   |

## Licence

MIT — see [LICENSE](LICENSE).
