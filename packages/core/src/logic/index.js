// JSON Logic (jsonlogic.com): the expressions of guards, effects and flow steps (spec §9.4, §9.5). A small evaluator
// of the standard operators, with the semantics of the reference implementation (json-logic-js), tested against the
// project's published cases. Pure: no operator has a side effect ("log" returns its value and prints nothing).

/** Operators of standard JSON Logic. */
export const OPERATORS = Object.freeze([
  "var",
  "missing",
  "missing_some",
  "if",
  "?:",
  "==",
  "===",
  "!=",
  "!==",
  "!",
  "!!",
  "or",
  "and",
  ">",
  ">=",
  "<",
  "<=",
  "max",
  "min",
  "+",
  "-",
  "*",
  "/",
  "%",
  "map",
  "reduce",
  "filter",
  "all",
  "none",
  "some",
  "merge",
  "in",
  "cat",
  "substr",
  "log"
]);

/** An expression that cannot be evaluated: an operator outside the standard set, or a failure while evaluating. */
export class LogicError extends Error {
  /**
   * @param {string} message
   * @param {{ operator?: string }} [details]
   */
  constructor(message, details = {}) {
    super(message);
    this.name = "LogicError";
    this.operator = details.operator;
  }
}

/** JSON Logic's truthiness: JavaScript's, except that an empty list is false. */
export function truthy(value) {
  if (Array.isArray(value) && value.length === 0) return false;
  return Boolean(value);
}

/** An operation is an object with exactly one key; anything else is a value. */
function isOperation(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 1;
}

/** The value at a dotted path of `data` ("" or null: data itself), or `fallback` when a step is missing. */
function read(data, path, fallback = null) {
  if (path === undefined || path === "" || path === null) return data;
  let value = data;
  for (const key of String(path).split(".")) {
    if (value === null || value === undefined) return fallback;
    value = value[key];
    if (value === undefined) return fallback;
  }
  return value;
}

/** Operators that take evaluated arguments. `data` is the data the operation runs against. */
const PLAIN = {
  // JSON Logic's == and != are JavaScript's loose equality.
  "==": (data, a, b) => a == b,
  "===": (data, a, b) => a === b,
  "!=": (data, a, b) => a != b,
  "!==": (data, a, b) => a !== b,
  ">": (data, a, b) => a > b,
  ">=": (data, a, b) => a >= b,
  "<": (data, a, b, c) => (c === undefined ? a < b : a < b && b < c),
  "<=": (data, a, b, c) => (c === undefined ? a <= b : a <= b && b <= c),
  "!!": (data, a) => truthy(a),
  "!": (data, a) => !truthy(a),
  "%": (data, a, b) => a % b,
  log: (data, a) => a,
  in: (data, a, b) => (b && typeof b.indexOf === "function" ? b.indexOf(a) !== -1 : false),
  cat: (data, ...args) => args.reduce((text, value) => text + value, ""),
  substr: (data, source, start, end) => {
    if (end < 0) {
      const tail = String(source).substr(start);
      return tail.substr(0, tail.length + end);
    }
    return String(source).substr(start, end);
  },
  "+": (data, ...args) => args.reduce((sum, value) => parseFloat(sum) + parseFloat(value), 0),
  "*": (data, ...args) => args.reduce((product, value) => parseFloat(product) * parseFloat(value)),
  "-": (data, a, b) => (b === undefined ? -a : a - b),
  "/": (data, a, b) => a / b,
  min: (data, ...args) => Math.min(...args),
  max: (data, ...args) => Math.max(...args),
  merge: (data, ...args) => args.reduce((list, value) => list.concat(value), []),
  var: (data, path, fallback) => read(data, path, fallback === undefined ? null : fallback),
  missing: (data, ...args) => {
    const keys = Array.isArray(args[0]) ? args[0] : args;
    return keys.filter(key => {
      const value = read(data, key);
      return value === null || value === "";
    });
  },
  missing_some: (data, needed, options) => {
    const missing = PLAIN.missing(data, options);
    return options.length - missing.length >= needed ? [] : missing;
  }
};

/** Operators that decide which of their arguments to evaluate, or evaluate them against other data. */
const SPECIAL = {
  if: ifThen,
  "?:": ifThen,
  and(values, data) {
    let current;
    for (const value of values) {
      current = apply(value, data);
      if (!truthy(current)) return current;
    }
    return current;
  },
  or(values, data) {
    let current;
    for (const value of values) {
      current = apply(value, data);
      if (truthy(current)) return current;
    }
    return current;
  },
  filter(values, data) {
    const items = apply(values[0], data);
    return Array.isArray(items) ? items.filter(item => truthy(apply(values[1], item))) : [];
  },
  map(values, data) {
    const items = apply(values[0], data);
    return Array.isArray(items) ? items.map(item => apply(values[1], item)) : [];
  },
  reduce(values, data) {
    const items = apply(values[0], data);
    const initial = values[2] === undefined ? null : apply(values[2], data);
    if (!Array.isArray(items)) return initial;
    return items.reduce((accumulator, current) => apply(values[1], { current, accumulator }), initial);
  },
  all(values, data) {
    const items = apply(values[0], data);
    if (!items.length) return false;
    return items.every(item => truthy(apply(values[1], item)));
  },
  none(values, data) {
    return SPECIAL.filter(values, data).length === 0;
  },
  some(values, data) {
    return SPECIAL.filter(values, data).length > 0;
  }
};

function ifThen(values, data) {
  let index = 0;
  for (; index < values.length - 1; index += 2) {
    if (truthy(apply(values[index], data))) return apply(values[index + 1], data);
  }
  return index === values.length - 1 ? apply(values[index], data) : null;
}

function apply(expression, data) {
  if (Array.isArray(expression)) return expression.map(item => apply(item, data));
  if (!isOperation(expression)) return expression;
  const scope = data ?? {};
  const [operator] = Object.keys(expression);
  const raw = expression[operator];
  const values = Array.isArray(raw) ? raw : [raw];
  if (Object.hasOwn(SPECIAL, operator)) return SPECIAL[operator](values, scope);
  if (!Object.hasOwn(PLAIN, operator)) {
    throw new LogicError(`"${operator}" is not a standard JSON Logic operator`, { operator });
  }
  return PLAIN[operator](scope, ...values.map(value => apply(value, scope)));
}

/**
 * Evaluate a JSON Logic expression. In Statewright the data is `{ event: { name, payload }, context, vars }`
 * (spec §16.10).
 * @param {unknown} expression
 * @param {unknown} [data]
 * @returns {unknown}
 * @throws {LogicError} for an operator outside the standard set, or anything that fails while evaluating.
 */
export function evaluate(expression, data) {
  try {
    return apply(expression, data);
  } catch (error) {
    if (error instanceof LogicError) throw error;
    throw new LogicError(`The expression cannot be evaluated: ${error.message}`);
  }
}
