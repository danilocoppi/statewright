# Statewright plugin

Statewright designs systems as layered specifications: architecture views, state machines and flows nested to any
depth, in one signed `.statewright.json` document. This plugin gives your agent the `statewright mcp` server: every
operation of the [Editor](https://statewright.cpss.com.br) is a tool, so the agent can model, simulate and audit a
design on files, or pair with the Editor you have open, where you see each of its changes and can undo it.

## Install

Claude Code:

```sh
/plugin install statewright --marketplace danilocoppi/statewright
```

or, from the shell, `claude plugin marketplace add danilocoppi/statewright`, then
`claude plugin install statewright@statewright`.

Codex:

```sh
codex plugin marketplace add danilocoppi/statewright
codex plugin add statewright@statewright
```

The server runs `npx -y statewright@latest mcp` and needs Node.js 22.12 or newer. If you registered it before with
`claude mcp add` or `codex mcp add`, remove that entry (`claude mcp remove statewright`, `codex mcp remove statewright`)
so the tools are not listed twice.

## Use

Open a project in the Editor, choose **Connect an AI…** and give your agent the code it shows. The
[guide](https://github.com/danilocoppi/statewright/blob/main/docs/guide/README.md#ai-agents-start-here) says how to
work.
