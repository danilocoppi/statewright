import { z } from "zod";
import { Project } from "../schema/document.js";
import { applyChange, changeArgs, changed, validate } from "./context.js";

/** Project commands (spec §21). */
export default [
  {
    type: "project.update",
    description: "Change the project's name or description (the project ID never changes).",
    args: z.strictObject({ ...changeArgs }),
    run(ctx, args) {
      validate(Project, changed(ctx.doc.project, args, ["id"]), ["project"]);
      applyChange(ctx.doc.project, args);
    }
  }
];
