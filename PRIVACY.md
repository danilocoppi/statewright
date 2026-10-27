# Privacy policy

Effective 2026-10-26.

Statewright is the Editor at https://statewright.cpss.com.br, the `statewright` package on npm (its library, command
line and MCP server) and the plugin for Claude Code and Codex. It is built so that your designs stay with you: there
are no accounts, no analytics, no advertising and no cookies, and nothing you design is sent to us.

## The Editor

- **Your projects stay in your browser.** The Editor keeps them in this browser's storage (IndexedDB), and in the files
  you open or save. They are not uploaded anywhere. Clearing the site's data in your browser deletes them; keep a
  saved file of anything you want to keep.
- **Preferences** such as the language, and the address of the server you paired with last, are kept in this browser's
  local storage.
- **Pairing with an AI agent.** When you choose Connect an AI…, the Editor talks only to the `statewright mcp` server
  on your own computer (127.0.0.1). Your project travels between the tab and that server, and from there to the agent
  you started. What the agent sends to its own model is governed by that agent's provider (for example Anthropic for
  Claude Code, OpenAI for Codex), not by us.
- **Voice dictation.** The microphone button uses your browser's speech recognition. In some browsers, Chrome among
  them, the audio is sent to the browser maker's servers (Google, for Chrome) to be turned into text. It is used only
  while you dictate, and only if you allow the microphone.
- **Serving the Editor.** The Editor's files are delivered by a hosting provider. Like any website, its servers may
  record standard request information, such as your IP address, browser and the files requested, in their access
  logs. We do not combine it with anything else or use it to identify you.

## The npm package and the plugin

The command line and the MCP server run on your computer and send nothing to us. The MCP server listens on 127.0.0.1
only, for the Editor, and works on the files and the Editor tab you point it at. Installing the package or the plugin
downloads them from npm and GitHub, under those services' own policies.

## Links

The Editor links to other sites, such as GitHub and this guide. Their own policies apply there.

## Changes and contact

If this policy changes, the new version is published here with its date. Questions and requests:
https://github.com/danilocoppi/statewright/issues
