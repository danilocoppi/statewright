/**
 * The JSON Schema of a catalog type (spec D3: types built with the visual editor are exported as JSON Schema; a raw
 * `jsonSchema` is authoritative when present).
 */

/** The format's primitive types (spec §10.1) as JSON Schema. */
const PRIMITIVES = {
  string: { type: "string" },
  integer: { type: "integer" },
  number: { type: "number" },
  decimal: { type: "string", pattern: "^-?\\d+(\\.\\d+)?$" },
  boolean: { type: "boolean" },
  date: { type: "string", format: "date" },
  datetime: { type: "string", format: "date-time" },
  duration: { type: "string", format: "duration" },
  uuid: { type: "string", format: "uuid" },
  email: { type: "string", format: "email" },
  url: { type: "string", format: "uri" },
  json: {}
};

/**
 * The JSON Schema (draft 2020-12) of a catalog type: an object with its fields (lists as arrays, required ones
 * listed), an enum with its values (and their descriptions), an alias as what it names. The types it refers to are
 * given under `$defs`, by name. A type with its own `jsonSchema` is that schema, as it is.
 * @param {any} doc
 * @param {string} typeId
 * @returns {object | null} null when `typeId` is not a type of the catalog.
 */
export function typeSchema(doc, typeId) {
  const types = doc.catalog.types;
  if (!types[typeId]) return null;
  if (types[typeId].jsonSchema !== undefined) return types[typeId].jsonSchema;
  const defs = {};
  const keys = new Map();

  /** The `$defs` key of a type: its name, or its name and ID when another type has that name. */
  const keyOf = id => {
    if (!keys.has(id)) {
      const name = types[id].name;
      keys.set(id, [...keys.values()].includes(name) ? `${name}_${id}` : name);
    }
    return keys.get(id);
  };
  const refTo = id => {
    const key = keyOf(id);
    if (!(key in defs)) {
      // Claimed before it is described, so a type that refers to itself is described once.
      defs[key] = {};
      defs[key] = bodyOf(id);
    }
    return { $ref: `#/$defs/${key}` };
  };
  const schemaOf = ref =>
    PRIMITIVES[ref] ? { ...PRIMITIVES[ref] }
    : types[ref] ? refTo(ref)
    : {};
  const described = (schema, description) => (description ? { ...schema, description } : schema);

  function bodyOf(id) {
    const type = types[id];
    if (type.jsonSchema !== undefined) return type.jsonSchema;
    if (type.kind === "object") {
      const fields = type.fields ?? [];
      const properties = Object.fromEntries(
        fields.map(field => {
          const item = schemaOf(field.type);
          return [field.name, described(field.list ? { type: "array", items: item } : item, field.description)];
        })
      );
      const required = fields.filter(field => field.required).map(field => field.name);
      return described(
        { type: "object", properties, ...(required.length && { required }), additionalProperties: false },
        type.description
      );
    }
    if (type.kind === "enum") {
      const values = type.values ?? [];
      const schema =
        values.some(value => value.description) ?
          { type: "string", oneOf: values.map(value => described({ const: value.value }, value.description)) }
        : { type: "string", enum: values.map(value => value.value) };
      return described(schema, type.description);
    }
    return described(schemaOf(type.of), type.description);
  }

  const root = bodyOf(typeId);
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: types[typeId].name,
    ...root,
    ...(Object.keys(defs).length && { $defs: defs })
  };
}
