// A small, consistent icon set: 16 × 16, 1.4 px strokes, currentColor. Decorative unless given a label.
const PATHS = {
  "chevron-down": "M4.5 6.5 8 10l3.5-3.5",
  "arrow-left": "M12.5 8h-9M7 4.5 3.5 8 7 11.5",
  "arrow-right": "M3.5 8h9M9 4.5 12.5 8 9 11.5",
  "arrow-up": "M8 12.5v-9M4.5 7 8 3.5 11.5 7",
  "arrow-up-right": "M4.5 11.5l7-7M6 4.5h5.5V10",
  search: "M7 11.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM10.3 10.3l3.2 3.2",
  plus: "M8 3.5v9M3.5 8h9",
  minus: "M3.5 8h9",
  more: "M4 8h.01M8 8h.01M12 8h.01",
  check: "M3.5 8.5 6.5 11.5 12.5 5",
  close: "M4.5 4.5l7 7M11.5 4.5l-7 7",
  upload: "M8 10.5V3M5 6l3-3 3 3M3 11.5v1.5h10v-1.5",
  download: "M8 3v7.5M5 7.5l3 3 3-3M3 11.5v1.5h10v-1.5",
  file: "M4 2.5h5l3 3v8H4zM9 2.5V5.5h3",
  image: "M2.5 3.5h11v9h-11zM2.5 10.5l3-3 2.5 2.5 2-2 3.5 3.5M10.5 6h.01",
  copy: "M5.5 5.5h7v7h-7zM3.5 10.5v-7h7",
  doc: "M4 2.5h8v11H4zM6 5.5h4M6 8h4M6 10.5h2.5",
  // Marking for the AI: a frame's corners round a point; a rectangle, an ellipse and an eraser to draw and erase.
  "mark-ai": "M3 6V3h3M10 3h3v3M13 10v3h-3M6 13H3v-3M8 6.5v3M6.5 8h3",
  rectangle: "M2.5 4.5h11v7h-11z",
  ellipse: "M8 4.5c3 0 5.5 1.6 5.5 3.5S11 11.5 8 11.5 2.5 9.9 2.5 8 5 4.5 8 4.5z",
  eraser: "M9.5 3 13.5 7l-5.5 5.5h-3L2.5 10.5zM6.5 6l4 4M8 12.5h5.5",
  lock: "M4.5 7.5h7v6h-7zM6 7.5v-2a2 2 0 0 1 4 0v2",
  // The levels: one above another, as the project's map shows them.
  levels: "M8 2.5 13.5 5.5 8 8.5 2.5 5.5zM2.5 8 8 11l5.5-3M2.5 10.5 8 13.5l5.5-3",
  // The catalog: a card box, its cards behind it, a label on its front.
  catalog: "M2.5 6.5h11v7h-11zM3.5 4.5h9M4.5 2.5h7M6.5 9.5h3",
  book: "M8 4.5C6.8 3.6 5 3.2 2.5 3.2v9c2.5 0 4.3.4 5.5 1.3 1.2-.9 3-1.3 5.5-1.3v-9c-2.5 0-4.3.4-5.5 1.3zM8 4.5v9",
  sparkle: "M8 2.5v3M8 10.5v3M2.5 8h3M10.5 8h3M4.5 4.5l1.5 1.5M10 10l1.5 1.5M11.5 4.5 10 6M6 10l-1.5 1.5",
  sun: "M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M12.6 3.4l-1 1M4.4 11.6l-1 1",
  moon: "M12.5 9.5A5 5 0 0 1 6.5 3.5a5 5 0 1 0 6 6z",
  monitor: "M2.5 3.5h11v7.5h-11zM6 13.5h4M8 11v2.5",
  globe:
    "M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM2.5 8h11M8 2.5c1.6 1.6 2.3 3.4 2.3 5.5S9.6 11.9 8 13.5C6.4 11.9 5.7 10.1 5.7 8S6.4 4.1 8 2.5z",
  alert: "M8 2.5 14 13H2zM8 6.5v3M8 11.2h.01",
  trash: "M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.5 9h6l.5-9",
  pencil: "M10.5 3 13 5.5 6 12.5H3.5V10z",
  duplicate: "M5.5 5.5h7v7h-7zM3.5 10.5v-7h7",
  system: "M2.5 3.5h5v4h-5zM8.5 8.5h5v4h-5zM7.5 5.5H10v3",
  machine: "M2.5 8a1.3 1.3 0 1 0 2.6 0 1.3 1.3 0 0 0-2.6 0zM7 5.5h6.5v5H7zM5.1 8H7",
  flow: "M8 2.5 11 5.5 8 8.5 5 5.5zM8 8.5v2M5 13h6",
  // A mixed level: a box, a step, a state and a start, one in each corner.
  mixed:
    "M2.5 2.5h4.5v3.5H2.5zM11 2.2 13.6 4.4 11 6.6 8.4 4.4zM9 9.5h4.5v4H9zM2.6 11.5a1.6 1.6 0 1 0 3.2 0 1.6 1.6 0 0 0-3.2 0z",
  "align-left": "M3 2.5v11M5.5 5.5h7M5.5 10.5h4.5",
  "align-centre": "M8 2.5v11M4.5 5.5h7M5.5 10.5h5",
  "align-right": "M13 2.5v11M3.5 5.5h7M6 10.5h4.5",
  "align-top": "M2.5 3h11M5.5 5.5v7M10.5 5.5v4.5",
  "align-middle": "M2.5 8h11M5.5 4.5v7M10.5 5.5v5",
  "align-bottom": "M2.5 13h11M5.5 3.5v7M10.5 6v4.5",
  "distribute-across": "M2.5 3v10M13.5 3v10M5.5 5.5h1.5v5H5.5zM9 5.5h1.5v5H9z",
  "distribute-down": "M3 2.5h10M3 13.5h10M5.5 5.5h5V7h-5zM5.5 9h5v1.5h-5z",
  region: "M3 5.5V3h2.5M10.5 3H13v2.5M13 10.5V13h-2.5M5.5 13H3v-2.5M7.5 3h1M7.5 13h1M3 7.5v1M13 7.5v1",
  paste: "M5.5 3.5h-2v10h9v-10h-2M6 2.5h4v2H6z",
  pointer: "M4 2.5 12 8.5 8.2 9.2 10.3 13 8.8 13.7 6.7 9.9 4 12.5z",
  note: "M3.5 2.5h9v7l-4 4h-5zM12.5 9.5h-4v4",
  link: "M6.5 9.5 12.5 3.5M8.5 3.5h4v4M11.5 9.5v3.5h-8.5v-8.5h3.5",
  service: "M3.5 3.5h9v9h-9z",
  actor: "M8 2.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM4.5 13.5c0-2.2 1.6-4 3.5-4s3.5 1.8 3.5 4",
  store:
    "M3.5 4c0-.8 2-1.5 4.5-1.5s4.5.7 4.5 1.5v8c0 .8-2 1.5-4.5 1.5S3.5 12.8 3.5 12zM3.5 4c0 .8 2 1.5 4.5 1.5s4.5-.7 4.5-1.5",
  queue: "M3 4.5h10M3 8h10M3 11.5h10",
  external: "M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z",
  state: "M4.5 4.5h7a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2z",
  initial: "M8 5.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4zM8 7.2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6z",
  choice: "M8 2.5 13.5 8 8 13.5 2.5 8z",
  history: "M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM6.2 5.5v5M9.8 5.5v5M6.2 8h3.6",
  any: "M8 3v10M3.7 5.5l8.6 5M3.7 10.5l8.6-5",
  entry: "M2.5 8h10M9 4.5 12.5 8 9 11.5",
  action: "M3 4.5h10v7H3z",
  switch: "M8 13.5V8M8 8 4 3.5M8 8l4-4.5M8 8V3",
  loop: "M12.5 8a4.5 4.5 0 1 1-1.3-3.2M12.5 3v2.5H10",
  wait: "M4.5 2.5h7M4.5 13.5h7M5 2.5c0 3 6 3 6 5.5s-6 2.5-6 5.5M11 2.5c0 3-6 3-6 5.5s6 2.5 6 5.5",
  parallel: "M2.5 5.5h8M8.5 3l2.5 2.5L8.5 8M2.5 10.5h8M8.5 8l2.5 2.5L8.5 13",
  end: "M8 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM8 6.3a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4z",
  undo: "M5.5 6.5h5a3 3 0 0 1 0 6H8M5.5 6.5 8 4M5.5 6.5 8 9",
  redo: "M10.5 6.5h-5a3 3 0 0 0 0 6H8M10.5 6.5 8 4M10.5 6.5 8 9",
  layout: "M2.5 3.5h4v3h-4zM9.5 3.5h4v3h-4zM6 10h4v3H6zM4.5 6.5V8h7V6.5M8 8v2",
  "select-all": "M3 5V3h2M11 3h2v2M13 11v2h-2M5 13H3v-2M7.5 3h1M7.5 13h1M3 7.5v1M13 7.5v1M6 6h4v4H6z",
  play: "M5.5 3.8v8.4L12 8z",
  present: "M2.5 3h11v8h-11zM8 11v2.5M5.5 13.5h5M7 5.3v3.4L9.8 7z",
  restart: "M3.5 8a4.5 4.5 0 1 0 1.3-3.2M3.5 3v2.5H6",
  clock: "M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM8 5v3.2l2.1 1.3",
  bolt: "M9 2.5 4.5 8.8h3.4L7 13.5l4.5-6.3H8.1z",
  call: "M2.5 8h7.5M7.5 5.5 10 8l-2.5 2.5M12.5 4v8"
};

// Shapes drawn filled rather than stroked: the heart, and GitHub's mark as GitHub draws it (Octicons' mark-github,
// set inside the same 1.5 px margin as the other icons).
const FILLED = {
  heart: { d: "M8 13.5 2.95 8.45A3.05 3.05 0 0 1 7.3 4.2l.7.7.7-.7a3.05 3.05 0 0 1 4.35 4.25z" },
  github: {
    d: "M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z",
    transform: "translate(1.5 1.5) scale(0.8125)"
  }
};

/**
 * @param {{ name: keyof typeof PATHS | keyof typeof FILLED, size?: number, label?: string, className?: string }} props
 */
export function Icon({ name, size = 16, label, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : "true"}
    >
      {FILLED[name] ?
        <path d={FILLED[name].d} transform={FILLED[name].transform} fill="currentColor" />
      : <path
          d={PATHS[name]}
          fill="none"
          stroke="currentColor"
          strokeWidth={name === "more" ? 2.4 : 1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      }
    </svg>
  );
}
