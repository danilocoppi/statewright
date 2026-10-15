import { z } from "zod";
import { FORMAT_VERSION } from "../constants.js";
import { Annotations } from "./annotations.js";
import { Name, common } from "./blocks.js";
import { Catalog } from "./catalog.js";
import { Canvas } from "./canvas.js";
import { idOf, mapOf, obj } from "./helpers.js";
import { Layout } from "./layout.js";

const Hex = z.string().regex(/^[0-9a-f]{64}$/, "Expected a lowercase SHA-256 hex digest");

export const Generator = obj(
  {
    name: z.string().min(1),
    version: z.string().min(1),
    channel: z.enum(["editor", "cli", "api"]),
    agent: z.string().min(1).optional()
  },
  { description: "Who wrote the file. Informational; excluded from hashes." }
);

export const Signature = obj(
  {
    algorithm: z.literal("sha256"),
    content: Hex,
    annotations: Hex,
    layout: Hex,
    signedAt: z.iso.datetime()
  },
  { description: "Hashes of the three sections (spec §17)." }
);

export const Project = obj({ id: idOf("prj"), name: Name, description: z.string().optional() });

export const Definition = obj(
  {
    kind: z.enum(["system", "machine", "flow", "mixed"]),
    name: Name,
    canvas: idOf("cnv"),
    ...common
  },
  { description: "A reusable canvas; elements whose inner points here are instances (spec §11)." }
);

export const documentSchema = obj(
  {
    $schema: z.string().optional(),
    statewright: z.literal(FORMAT_VERSION),
    generator: Generator.optional(),
    signature: Signature.optional(),
    project: Project,
    root: idOf("cnv"),
    catalog: Catalog,
    definitions: mapOf("def", Definition),
    canvases: mapOf("cnv", Canvas),
    annotations: Annotations.optional(),
    layout: Layout.optional()
  },
  { description: "A Statewright document." }
);
