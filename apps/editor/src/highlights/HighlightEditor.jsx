import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { HIGHLIGHT_COLOURS, HIGHLIGHT_PALETTE, highlightLook } from "statewright";

import { paint } from "@/canvas/palette";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Segmented } from "@/components/ui/Segmented";
import { TextField } from "@/components/ui/TextField";
import { createCommands } from "@/inspector/references";
import { cn } from "@/lib/cn";
import { editorStore, useEditor } from "@/store/editor";

const HEX = /^#[0-9A-Fa-f]{6}$/;

/** Where a project with no highlight can start from (highlights spec §6). */
const SUGGESTIONS = [
  { key: "start", colour: "green", border: "bold", fill: "none", chip: true },
  { key: "critical", colour: "red", border: "bold", fill: "tint", chip: true },
  { key: "review", colour: "amber", border: "bold", fill: "tint", chip: false },
  { key: "done", colour: "teal", border: "normal", fill: "none", chip: false }
];

/** The ten colours as swatches, a radio group moved through with the arrow keys. */
function Swatches({ label, value, onChange }) {
  const { t } = useTranslation("inspector");
  const current = Math.max(0, HIGHLIGHT_PALETTE.indexOf(value));
  const select = (index, element) => {
    const name = HIGHLIGHT_PALETTE[(index + HIGHLIGHT_PALETTE.length) % HIGHLIGHT_PALETTE.length];
    onChange(name);
    element?.parentElement?.children[HIGHLIGHT_PALETTE.indexOf(name)]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {HIGHLIGHT_PALETTE.map((name, index) => {
        const checked = name === value;
        return (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={t(`highlights.colours.${name}`)}
            title={t(`highlights.colours.${name}`)}
            tabIndex={index === current ? 0 : -1}
            onClick={() => onChange(name)}
            onKeyDown={event => {
              const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
              if (!step) return;
              event.preventDefault();
              select(index + step, event.currentTarget);
            }}
            style={{ background: paint(HIGHLIGHT_COLOURS[name].light.stroke) }}
            className={cn(
              "size-6 rounded-full ring-offset-2 ring-offset-surface transition-shadow duration-150 motion-reduce:transition-none",
              checked ? "ring-2 ring-ink" : "hover:ring-2 hover:ring-control-border"
            )}
          />
        );
      })}
    </div>
  );
}

/** A box drawn in the highlight's look, in the theme shown, with its tag when it shows one. */
function Preview({ form, label }) {
  const theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
  const look = highlightLook({ colour: form.colour, border: form.border }, theme);
  const surface = theme === "dark" ? "#3B414F" : "#FFFFFF";
  const tag = (form.name.trim() || label).toUpperCase();
  const tagWidth = Math.min(132, 12 + tag.length * 6.2);
  return (
    <svg
      data-testid="highlight-preview"
      aria-hidden="true"
      width="176"
      height="72"
      viewBox="0 0 176 72"
      className="shrink-0 overflow-visible"
    >
      <rect
        x="8"
        y="8"
        width="160"
        height="56"
        rx="8"
        fill={form.fill === "tint" ? look.tint : surface}
        stroke={look.stroke}
        strokeWidth={look.width.box}
      />
      {form.chip && (
        <g>
          <rect
            x="16"
            y="15"
            width={tagWidth}
            height="13"
            rx="2"
            fill={look.tint}
            stroke={look.text}
            strokeOpacity="0.45"
          />
          <text
            x={16 + tagWidth / 2}
            y="24.5"
            textAnchor="middle"
            fontSize="7.5"
            fontFamily="var(--font-mono)"
            fill={look.text}
          >
            {tag}
          </text>
        </g>
      )}
      <text x="88" y={form.chip ? 48 : 40} textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">
        {label}
      </text>
    </svg>
  );
}

/**
 * Make a highlight, or edit one (highlights spec §6): its name; a colour from the ten or a hex; its border, fill and
 * tag; what it means; a preview of a box in that look. Saving is one change: a new highlight is created together with
 * what `apply` does with it (applied to the element it was made for).
 * @param {{ open: boolean, onClose: () => void, id?: string, name?: string,
 *   apply?: (doc: any, highlightId: string) => object[] }} props `id`: the highlight edited; `name`: the name typed.
 */
export function HighlightEditor({ open, onClose, id, name = "", apply = () => [] }) {
  const { t } = useTranslation("inspector");
  const doc = useEditor(state => state.doc);
  const existing = id ? doc?.catalog.highlights[id] : null;
  const [form, setForm] = useState(() => ({
    name: existing?.name ?? name,
    colour: existing?.colour ?? "grey",
    border: existing?.border ?? "bold",
    fill: existing?.fill ?? "none",
    chip: existing?.chip ?? false,
    description: existing?.description ?? ""
  }));
  const [hex, setHex] = useState(existing?.colour?.startsWith("#") ? existing.colour : "");
  const chipId = useId();
  const meaningId = useId();
  const set = change => setForm(previous => ({ ...previous, ...change }));
  const hexInvalid = hex !== "" && !HEX.test(hex);
  const suggest = !id && !Object.keys(doc?.catalog.highlights ?? {}).length;

  const save = () => {
    const item = {
      name: form.name.trim(),
      colour: form.colour,
      border: form.border,
      fill: form.fill,
      chip: form.chip,
      ...(form.description.trim() ? { description: form.description.trim() } : {})
    };
    const store = editorStore.getState();
    if (existing) {
      const unset = existing.description !== undefined && !item.description ? ["description"] : [];
      store.dispatch([{ type: "catalog.update", args: { id, set: item, ...(unset.length ? { unset } : {}) } }], {
        label: t("highlights.edited", { name: item.name })
      });
    } else {
      const created = createCommands(store.doc, "highlights", item);
      store.dispatch([...created.commands, ...apply(store.doc, created.id)], {
        label: t("highlights.created", { name: item.name })
      });
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={existing ? t("highlights.editTitle") : t("highlights.newTitle")}
      description={t("highlights.description")}
      testId="highlight-editor"
      actions={
        <>
          <Button onClick={onClose}>{t("highlights.cancel")}</Button>
          <Button variant="primary" disabled={!form.name.trim() || hexInvalid} onClick={save}>
            {t("highlights.save")}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {suggest && (
          <div role="group" aria-label={t("highlights.suggestions")} className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-label text-muted">{t("highlights.suggestions")}</span>
            {SUGGESTIONS.map(({ key, ...look }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setHex("");
                  set({
                    ...look,
                    name: t(`highlights.suggested.${key}`),
                    description: t(`highlights.suggestedMeaning.${key}`)
                  });
                }}
                style={{ borderColor: paint(HIGHLIGHT_COLOURS[look.colour].light.stroke) }}
                className="h-6 rounded-full border px-2.5 text-label text-sub hover:text-ink"
              >
                {t(`highlights.suggested.${key}`)}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-start gap-5">
          <div className="grid min-w-0 flex-1 gap-3.5">
            <TextField
              label={t("highlights.name")}
              value={form.name}
              onChange={value => set({ name: value })}
              autoFocus
            />
            <div className="grid gap-1.5">
              <span className="text-label text-sub">{t("highlights.colour")}</span>
              <Swatches
                label={t("highlights.colour")}
                value={HEX.test(form.colour) ? null : form.colour}
                onChange={colour => {
                  setHex("");
                  set({ colour });
                }}
              />
              <TextField
                label={t("highlights.hex")}
                value={hex}
                placeholder="#C2410C"
                hint={hexInvalid ? undefined : t("highlights.hexHint")}
                error={hexInvalid ? t("highlights.hexInvalid") : undefined}
                onChange={value => {
                  setHex(value);
                  if (HEX.test(value)) set({ colour: value.toUpperCase() });
                }}
              />
            </div>
          </div>
          <div className="grid justify-items-center gap-1.5 pt-5">
            <Preview form={form} label={t("highlights.previewName")} />
            <span className="text-label text-muted">{t("highlights.preview")}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <div className="grid gap-1.5">
            <span className="text-label text-sub">{t("highlights.border")}</span>
            <Segmented
              label={t("highlights.border")}
              value={form.border}
              onChange={border => set({ border })}
              options={["normal", "bold", "heavy"].map(value => ({ value, label: t(`highlights.borders.${value}`) }))}
            />
          </div>
          <div className="grid gap-1.5">
            <span className="text-label text-sub">{t("highlights.fill")}</span>
            <Segmented
              label={t("highlights.fill")}
              value={form.fill}
              onChange={fill => set({ fill })}
              options={["none", "tint"].map(value => ({ value, label: t(`highlights.fills.${value}`) }))}
            />
          </div>
        </div>
        <label htmlFor={chipId} className="flex items-center gap-2 text-ui text-ink">
          <input
            id={chipId}
            type="checkbox"
            checked={form.chip}
            onChange={event => set({ chip: event.target.checked })}
            className="size-4 accent-[var(--accent)]"
          />
          {t("highlights.chip")}
        </label>
        <div className="grid gap-1.5">
          <label htmlFor={meaningId} className="text-label text-sub">
            {t("highlights.meaning")}
          </label>
          <textarea
            id={meaningId}
            rows={2}
            value={form.description}
            onChange={event => set({ description: event.target.value })}
            className="resize-none rounded-control border border-control-border bg-surface px-2.5 py-1.5 text-read text-ink outline-none focus:border-accent"
          />
        </div>
      </div>
    </Dialog>
  );
}
