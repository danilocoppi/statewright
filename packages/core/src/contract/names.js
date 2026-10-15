// The words a contract uses for what a design references by ID (source-of-truth spec §5): code holds names, not IDs.
// An event is its name (`booking.confirmed`), an endpoint its method and path (`POST /bookings`), a webhook, an
// action, a party or a guard its name, a timer its name with how it runs.

/** The catalog item `id` of `collection`, or undefined. */
const itemOf = (doc, collection, id) => doc.catalog?.[collection]?.[id];

/** An event's name. */
export const eventName = (doc, id) => itemOf(doc, "events", id)?.name ?? id;

/** An endpoint as code routes it, `POST /bookings`; a webhook by its name. */
export function viaName(doc, id) {
  const endpoint = itemOf(doc, "endpoints", id);
  if (endpoint) return `${endpoint.method} ${endpoint.path}`;
  return itemOf(doc, "webhooks", id)?.name ?? id;
}

/** A party's name. */
export const partyName = (doc, id) => itemOf(doc, "parties", id)?.name ?? id;

/** An action's name. */
export const actionName = (doc, id) => itemOf(doc, "actions", id)?.name ?? id;

/** A timer: its name, and when it fires — after `duration`, or `at` a context path (`offset`, `calendar`). */
export function timerOf(doc, id) {
  const timer = itemOf(doc, "timers", id);
  if (!timer) return { timer: id };
  const { name, duration, at, offset, calendar } = timer;
  return {
    timer: name,
    ...(duration !== undefined ? { duration } : {}),
    ...(at !== undefined ? { at } : {}),
    ...(offset !== undefined ? { offset } : {}),
    ...(calendar !== undefined ? { calendar } : {})
  };
}

/**
 * A condition as code needs it: the named guard's name, the JSON Logic expression (the guard's own when the condition
 * names one), the text a person wrote.
 */
export function conditionOf(doc, condition) {
  if (!condition) return undefined;
  const guard = condition.guard ? itemOf(doc, "guards", condition.guard) : undefined;
  const expr = condition.expr ?? guard?.expr;
  return {
    ...(guard ? { name: guard.name } : {}),
    ...(expr !== undefined ? { expr } : {}),
    ...(condition.text !== undefined ? { text: condition.text } : {})
  };
}

/** Effects by name: an action, `emit <event>`, `assign <path>` (one per path). */
export function effectsOf(doc, effects) {
  if (!effects) return undefined;
  return effects.flatMap(effect => {
    if (effect.action) return [actionName(doc, effect.action)];
    if (effect.emit) return [`emit ${eventName(doc, effect.emit)}`];
    return Object.keys(effect.assign ?? {}).map(path => `assign ${path}`);
  });
}

/** Keep the keys whose value is defined. */
export const defined = object => Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
