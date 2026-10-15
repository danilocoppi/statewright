import { z } from "zod";
import { CATALOG_COLLECTIONS } from "../constants.js";
import {
  ActionDef,
  EndpointDef,
  EventDef,
  GuardDef,
  PartyDef,
  StatusDef,
  TimerDef,
  TypeDef,
  WebhookDef
} from "../schema/catalog.js";
import {
  allocateId,
  applyChange,
  changeArgs,
  changed,
  checkRefs,
  clone,
  refsOf,
  requireEntry,
  validate
} from "./context.js";
import { checkInner, keepOwnInterior } from "./inner.js";
import { removeElements } from "./remove.js";

const SCHEMAS = {
  types: TypeDef,
  events: EventDef,
  actions: ActionDef,
  guards: GuardDef,
  endpoints: EndpointDef,
  webhooks: WebhookDef,
  timers: TimerDef,
  statuses: StatusDef,
  parties: PartyDef
};

const Collection = z.enum(Object.keys(CATALOG_COLLECTIONS));

/** Validate a catalog item as it will be stored, with its references and interior. */
function checkItem(ctx, collection, id, item) {
  validate(SCHEMAS[collection], item, ["catalog", collection, id]);
  checkRefs(ctx, refsOf("catalogItem", collection, id, item), { self: id });
  if (item.inner) checkInner(ctx, { id, type: "catalog", collection, value: item }, item.inner, item);
}

/** Catalog commands (spec §21). */
export default [
  {
    type: "catalog.add",
    description: "Add a type, event, action, guard, endpoint, webhook, timer, status or party to the catalog.",
    args: z.strictObject({
      collection: Collection,
      item: z.record(z.string(), z.unknown()).describe("The item, without its ID (see the format reference)."),
      id: z.string().optional().describe("Optional ID; generated from the item name when omitted.")
    }),
    run(ctx, { collection, item, id }) {
      const value = clone(item);
      const itemId = allocateId(ctx, CATALOG_COLLECTIONS[collection], value.name ?? collection, id);
      checkItem(ctx, collection, itemId, value);
      ctx.doc.catalog[collection][itemId] = value;
    }
  },
  {
    type: "catalog.update",
    description: "Change fields of a catalog item. References to it keep working because they use its ID.",
    args: z.strictObject({ id: z.string(), ...changeArgs }),
    run(ctx, { id, ...change }) {
      const entry = requireEntry(ctx, id, ["catalog"]);
      const next = changed(entry.value, change);
      keepOwnInterior(entry.value, next);
      checkItem(ctx, entry.collection, id, next);
      applyChange(entry.value, change);
    }
  },
  {
    type: "catalog.remove",
    description: "Remove a catalog item. Fails with IN_USE while it is referenced, unless cascade is true.",
    args: z.strictObject({ id: z.string(), cascade: z.boolean().optional() }),
    run(ctx, { id, cascade }) {
      requireEntry(ctx, id, ["catalog"]);
      removeElements(ctx.doc, [id], { cascade });
    }
  }
];
