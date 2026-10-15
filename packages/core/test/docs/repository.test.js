// The repository's own documents (source-of-truth spec §8): README.md for people arriving at the repository, AGENTS.md
// for AI agents, CLAUDE.md importing AGENTS.md. Every link leads somewhere, and every command they show exists.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sectionsOf } from "../../src/mcp/guide.js";

const ROOT = new URL("../../../../", import.meta.url);
const read = path => readFileSync(new URL(path, ROOT), "utf8");
const packageOf = path => JSON.parse(read(path));
const WORKSPACES = {
  "": packageOf("package.json"),
  statewright: packageOf("packages/core/package.json"),
  "@statewright/editor": packageOf("apps/editor/package.json")
};
const COMMANDS = readdirSync(new URL("packages/core/src/cli/commands/", ROOT)).map(file => file.replace(/\.js$/, ""));
const GUIDE = new Set(sectionsOf(read("docs/guide/README.md")).map(section => section.id));
const REPOSITORY = "https://github.com/danilocoppi/statewright";
/** The wallets that take donations, exactly as published (never altered). */
const WALLETS = {
  solana: "DCA31TRz39qmKPseSRMjANN7cGYoWGUbtkC582oMRyWy",
  evm: "0x54636195948915f091466f027025973328813a3a"
};

/** The code a Markdown text shows: its inline code and its code blocks. */
const codeOf = text => [
  ...[...text.matchAll(/```[a-z]*\n([\s\S]*?)\n```/g)].map(match => match[1]),
  ...[...text.replace(/```[a-z]*\n[\s\S]*?\n```/g, "").matchAll(/`([^`\n]+)`/g)].map(match => match[1])
];

describe("the repository's documents (source-of-truth spec §8)", () => {
  const readme = read("README.md");
  const agents = read("AGENTS.md");

  it("points AI agents from README.md to AGENTS.md, which CLAUDE.md imports", () => {
    expect(readme).toContain("**AI agents: read [AGENTS.md](AGENTS.md).**");
    expect(read("CLAUDE.md")).toBe("@AGENTS.md\n");
  });

  it("names the three ways of working with an AI in README.md, each with its playbook", () => {
    for (const words of [
      "1. **Map the system you have.**",
      "(docs/guide/README.md#map-your-system-level-by-level)",
      "2. **Design together.**",
      "(docs/guide/README.md#design-a-system-with-the-person-level-by-level)",
      "3. **Build from the design.**",
      "`statewright contract` writes the design's machines, flows and scenarios as JSON for code",
      "[The contract](docs/guide/README.md#the-contract)",
      "`statewright conform` turns what differs into findings on the canvas",
      "[Build from the design](docs/guide/README.md#build-from-the-design)"
    ]) {
      expect(readme).toContain(words);
    }
  });

  it("tells agents in AGENTS.md how to use Statewright elsewhere and how to work here", () => {
    for (const heading of [
      "## Using Statewright in another project",
      "## Working on this repository",
      "### Commands",
      "### Conventions",
      "### Generated files",
      "### How work is done here"
    ]) {
      expect(agents).toContain(`\n${heading}\n`);
    }
    expect(agents).toContain("[AI agents: start here](docs/guide/README.md#ai-agents-start-here)");
  });

  it.each(["README.md", "AGENTS.md"])("links in %s to files and guide sections that exist", name => {
    const links = [...read(name).matchAll(/\]\(([^)\s]+)\)/g)]
      .map(match => match[1])
      .filter(link => !/^https?:/.test(link));
    expect(links.length).toBeGreaterThan(3);
    for (const link of links) {
      const [path, anchor] = link.split("#");
      expect(existsSync(new URL(path, ROOT)), link).toBe(true);
      if (anchor) expect(path === "docs/guide/README.md" && GUIDE.has(anchor), link).toBe(true);
    }
  });

  it.each(["README.md", "AGENTS.md"])("shows in %s only commands that exist", name => {
    const code = codeOf(read(name)).join("\n");
    const scripts = [...code.matchAll(/npm (?:run ([a-z0-9:-]+)|(test))(?: -w (\S+))?/g)];
    expect(scripts.length).toBeGreaterThan(2);
    for (const [line, script, test, workspace = ""] of scripts) {
      expect(WORKSPACES[workspace]?.scripts?.[script ?? test], line).toBeDefined();
    }
    for (const [line, command] of code.matchAll(/statewright ([a-z]+)/g)) expect(COMMANDS, line).toContain(command);
  });

  it("names a document a .sttw in README.md and AGENTS.md, as Statewright saves it", () => {
    expect(readme).toContain("one signed JSON document (`*.sttw`)");
    expect(agents).toContain("`examples/*.sttw`");
    for (const text of [readme, agents]) expect(text).not.toContain(".statewright.json");
  });

  it("names the source on GitHub and its issues near the top of README.md, and in AGENTS.md", () => {
    const top = readme.slice(0, readme.indexOf("\n## ")).replace(/\s+/g, " ");
    expect(top).toContain(
      `- **The source:** ${REPOSITORY}, where problems and ideas go to its [issues](${REPOSITORY}/issues).`
    );
    expect(agents).toContain(`The repository is ${REPOSITORY}`);
  });

  it("asks for support in README.md with the two wallets, exactly, and says the licence is MIT", () => {
    const support = readme.slice(readme.indexOf("\n## Support the project\n"));
    const rows = Object.fromEntries(
      [...support.matchAll(/^\| (.+?) +\| `([^`]+)` +\|$/gm)].map(([, network, address]) => [network, address])
    );
    expect(rows).toEqual({ Solana: WALLETS.solana, "ETH · BSC · Polygon (EVM)": WALLETS.evm });
    expect(readme).toContain("\n## Licence\n\nMIT — see [LICENSE](LICENSE).\n");
  });
});

describe("the licence (MIT, for the whole repository)", () => {
  it("is the same MIT text at the root and in the npm package", () => {
    const licence = read("LICENSE");
    expect(licence).toMatch(/^MIT License\n\nCopyright \(c\) 2026 Danilo Coppi\n/);
    expect(read("packages/core/LICENSE")).toBe(licence);
  });

  it.each(Object.keys(WORKSPACES))("is the licence of the workspace %j", name => {
    expect(WORKSPACES[name].license).toBe("MIT");
  });

  it("gives npm the package's repository, issues and home", () => {
    const core = WORKSPACES.statewright;
    expect(core.repository).toEqual({
      type: "git",
      url: "git+https://github.com/danilocoppi/statewright.git",
      directory: "packages/core"
    });
    expect(core.bugs).toEqual({ url: `${REPOSITORY}/issues` });
    expect(core.homepage).toBe("https://statewright.cpss.com.br");
  });
});
