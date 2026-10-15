import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TONES } from "statewright";

import { paint } from "@/canvas/palette";
import { Icon } from "@/components/ui/Icon";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/lib/cn";

import { Swatch } from "../Swatch";
import { useField } from "../useField";
import { compact, evidenceSummary } from "../values";
import { INPUT, ParsedPart } from "./parts";
import { Row } from "./Row";

/** The parts of each kind of evidence, the first one required (format §9.1). */
const EVIDENCE = { code: ["path", "lines", "repo", "commit", "symbol"], doc: ["url", "title", "quote"] };

/** A small text button that adds something. */
function AddButton({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-7 items-center gap-1 text-[12px] font-medium text-accent hover:underline"
    >
      <Icon name="plus" size={12} />
      {label}
    </button>
  );
}

/**
 * Where an element was observed (format §9.1): in code (a path, lines, repository, commit, symbol) or in documentation
 * (a URL, its title, a quote) — a line each, opened to change its parts.
 */
export function EvidenceControl({ id, field, value, layer }) {
  const { t } = useTranslation("inspector");
  const edit = useField(id, field);
  const [open, setOpen] = useState(null);
  const [adding, setAdding] = useState(null);
  const [text, setText] = useState("");
  const list = value ?? [];
  const set = next => edit.change(next.length ? next : undefined);
  // A line being added that is left (Esc, elsewhere) is dropped with what was typed in it.
  const stopAdding = () => {
    setAdding(null);
    setText("");
  };
  const replace = (index, part, next) =>
    set(list.map((item, at) => (at === index ? { kind: item.kind, ...compact({ ...item, [part]: next }) } : item)));
  return (
    <Row label={edit.label} layer={layer} wide error={edit.error}>
      {list.length > 0 && (
        // One column no wider than the field, however long a line: a line never pushes its remove button out.
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-1">
          {list.map((item, index) => {
            const line = evidenceSummary(item);
            return (
              <li key={index} className="grid grid-cols-[minmax(0,1fr)] gap-1.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-expanded={open === index}
                    onClick={() => setOpen(open === index ? null : index)}
                    className="flex min-w-0 flex-1 items-baseline gap-2 rounded-[6px] py-0.5 text-left hover:bg-subtle"
                  >
                    {/* A long path is cut short, whole on hover, so it never runs under its remove button. */}
                    <span title={line.main} className="min-w-0 truncate font-mono text-[12px] text-accent">
                      {line.main}
                    </span>
                    {line.more && <span className="truncate text-[12px] text-muted">{line.more}</span>}
                  </button>
                  {!edit.readOnly && (
                    <button
                      type="button"
                      aria-label={t("refs.remove", { name: line.main })}
                      onClick={() => set(list.toSpliced(index, 1))}
                      className="grid size-6 shrink-0 place-items-center rounded-[6px] text-muted hover:bg-subtle hover:text-ink"
                    >
                      <Icon name="close" size={12} />
                    </button>
                  )}
                </div>
                {open === index && (
                  <div className="grid grid-cols-2 gap-2 border-l-2 border-hairline pb-1 pl-3">
                    {EVIDENCE[item.kind].map(part => (
                      <ParsedPart
                        key={part}
                        label={t(`evidence.${part}`)}
                        value={item[part]}
                        parse={part === "lines" ? text => (/^\d+(-\d+)?$/.test(text) ? text : undefined) : text => text}
                        hint={part === "lines" ? "34-52" : undefined}
                        readOnly={edit.readOnly}
                        mono={part !== "title" && part !== "quote"}
                        onCommit={next => replace(index, part, next)}
                        className={part === "quote" || part === "url" || part === "path" ? "col-span-2" : undefined}
                      />
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {!edit.readOnly &&
        (adding ?
          <input
            autoFocus
            aria-label={t(`evidence.${EVIDENCE[adding][0]}`)}
            placeholder={t(`evidence.${adding}Hint`)}
            value={text}
            onChange={event => setText(event.target.value)}
            onBlur={stopAdding}
            onKeyDown={event => {
              if (event.key === "Escape") {
                event.stopPropagation();
                stopAdding();
              }
              if (event.key !== "Enter" || !text.trim()) return;
              event.preventDefault();
              if (edit.change([...list, { kind: adding, [EVIDENCE[adding][0]]: text.trim() }])) stopAdding();
            }}
            className={cn(INPUT, "mt-1 font-mono text-[12px]")}
          />
        : <div className="mt-0.5 flex gap-3">
            <AddButton label={t("evidence.addCode")} onClick={() => setAdding("code")} />
            <AddButton label={t("evidence.addDoc")} onClick={() => setAdding("doc")} />
          </div>)}
    </Row>
  );
}

/** A tag's colours, as the diagram draws its chip. */
const toned = tone => {
  const colours = TONES[tone ?? "neutral"];
  return { background: paint(colours.fill), borderColor: paint(colours.color), color: paint(colours.color) };
};

/**
 * Free tags (format §9.1) as their chips: one added with Enter; a click on a chip shows its tones, in the diagram's
 * colours; × takes it out.
 */
export function TagsControl({ id, field, value, layer }) {
  const { t } = useTranslation("inspector");
  const edit = useField(id, field);
  const [chosen, setChosen] = useState(null);
  const [text, setText] = useState("");
  const list = value ?? [];
  const set = next => edit.change(next.length ? next : undefined);
  const tag = chosen === null ? null : list[chosen];
  return (
    <Row label={edit.label} layer={layer} wide error={edit.error}>
      <div className="grid gap-1.5">
        {list.length > 0 && (
          <ul className="flex flex-wrap gap-1">
            {list.map((item, index) => (
              <li
                key={`${item.text}-${index}`}
                style={toned(item.tone)}
                className={cn(
                  "inline-flex h-6 items-center rounded-[5px] border font-mono text-[10.5px] font-medium uppercase tracking-[0.03em]",
                  chosen === index && "ring-2 ring-accent/30"
                )}
              >
                <button
                  type="button"
                  aria-pressed={chosen === index}
                  disabled={edit.readOnly}
                  onClick={() => setChosen(chosen === index ? null : index)}
                  className="h-full px-2"
                >
                  {item.text}
                </button>
                {!edit.readOnly && (
                  <button
                    type="button"
                    aria-label={t("refs.remove", { name: item.text })}
                    onClick={() => {
                      setChosen(null);
                      set(list.toSpliced(index, 1));
                    }}
                    className="-my-px grid size-6 place-items-center opacity-70 hover:opacity-100"
                  >
                    <Icon name="close" size={10} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {tag && !edit.readOnly && (
          <Segmented
            label={t("tags.tone", { tag: tag.text })}
            value={tag.tone ?? "neutral"}
            pills
            options={Object.keys(TONES).map(tone => ({
              value: tone,
              label: t(`choices.tone.${tone}`),
              icon: <Swatch swatch={{ tone }} />
            }))}
            onChange={tone =>
              set(
                list.map((item, at) =>
                  at === chosen ? { text: item.text, ...(tone !== "neutral" && { tone }) } : item
                )
              )
            }
          />
        )}
        {!edit.readOnly && (
          <input
            aria-label={t("tags.add")}
            placeholder={t("tags.add")}
            value={text}
            onChange={event => setText(event.target.value)}
            onKeyDown={event => {
              if (event.key !== "Enter" || !text.trim()) return;
              event.preventDefault();
              set([...list, { text: text.trim() }]);
              setText("");
            }}
            className={cn(INPUT, "h-7")}
          />
        )}
      </div>
    </Row>
  );
}
