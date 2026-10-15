import { toJSONSchema } from "../../schema/json-schema.js";

/** `statewright schema` (spec §24). */
export default {
  name: "schema",
  usage: "schema [--base-url <url>]",
  summary: "Print the JSON Schema of the format (with --base-url, its $id).",
  args: [0, 0],
  options: { "base-url": { type: "string" } },
  async run({ options, io }) {
    io.stdout(`${JSON.stringify(toJSONSchema({ baseUrl: options["base-url"] }), null, 2)}\n`);
    return 0;
  }
};
