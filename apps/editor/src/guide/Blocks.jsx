import { Fragment, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { EDGE_STYLES, NODE_STYLES } from "statewright";

import { EdgeSwatch, NodeSwatch } from "@/canvas/LegendSwatch";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { useCopy } from "@/lib/useCopy";
import { SEVERITY_DOT } from "@/problems/store";

import { asset } from "./links";

/** The plain text of inline nodes. */
const plain = nodes => nodes.map(node => node.v ?? (node.c ? plain(node.c) : (node.alt ?? ""))).join("");

/** Inline content: text, strong, emphasis, code, links and images. */
function Inline({ nodes }) {
  return nodes.map((node, index) => {
    switch (node.t) {
      case "strong":
        return (
          <strong key={index} className="font-semibold text-ink">
            <Inline nodes={node.c} />
          </strong>
        );
      case "em":
        return (
          <em key={index}>
            <Inline nodes={node.c} />
          </em>
        );
      case "code":
        return (
          <code key={index} className="rounded-chip bg-subtle px-[3px] py-px font-mono text-[0.9em] text-ink">
            {node.v}
          </code>
        );
      case "link":
        return (
          <a
            key={index}
            href={node.href}
            {...(node.href.startsWith("#") ? {} : { target: "_blank", rel: "noreferrer" })}
            className="text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
          >
            <Inline nodes={node.c} />
          </a>
        );
      case "img":
        return <img key={index} src={asset(node.src)} alt={node.alt} className="inline h-auto max-w-full" />;
      case "br":
        return <br key={index} />;
      default:
        return <Fragment key={index}>{node.v}</Fragment>;
    }
  });
}

const HEADINGS = {
  1: "text-page font-semibold tracking-tight text-ink",
  2: "mt-16 border-t border-hairline pt-10 text-page font-semibold tracking-tight text-ink",
  3: "mt-10 text-title font-semibold text-ink",
  4: "mt-8 text-read font-semibold text-ink"
};

/** A code example, with Copy. */
function Code({ text }) {
  const { t } = useTranslation();
  const { copied, copy } = useCopy();
  return (
    <div className="group relative mt-4">
      <pre className="whitespace-pre-wrap break-words rounded-control border border-hairline bg-subtle px-4 py-3 pr-20 font-mono text-[12px] leading-relaxed text-ink">
        <code>{text}</code>
      </pre>
      <button
        type="button"
        onClick={() => copy("code", text)}
        className="absolute right-2 top-2 inline-flex h-7 items-center gap-1.5 rounded-control px-2 text-label text-sub opacity-0 transition-opacity duration-150 hover:bg-surface hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <Icon name={copied ? "check" : "copy"} size={13} />
        {copied ? t("guide.copied") : t("guide.copyCode")}
      </button>
    </div>
  );
}

/** A severity in the rules table, with the Problems panel's dot. */
function Severity({ nodes }) {
  const word = plain(nodes);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {SEVERITY_DOT[word] && <span aria-hidden="true" className={cn("size-1.5 rounded-full", SEVERITY_DOT[word])} />}
      {word}
    </span>
  );
}

/**
 * A table's box: it scrolls sideways where the page is narrower than the table (a phone), and then takes the focus
 * too, so the keyboard can scroll it.
 */
function Wide({ children }) {
  const ref = useRef(null);
  const [scrolls, setScrolls] = useState(false);
  useEffect(() => {
    const box = ref.current;
    const measure = () => setScrolls(box.scrollWidth > box.clientWidth);
    measure();
    document.fonts?.ready.then(measure);
    addEventListener("resize", measure);
    return () => removeEventListener("resize", measure);
  }, []);
  return (
    <div ref={ref} tabIndex={scrolls ? 0 : undefined} className="mt-4 max-w-[880px] overflow-x-auto">
      {children}
    </div>
  );
}

const cell = "border-b border-hairline py-2 pr-4 align-top first:pl-2";
const head = "border-b border-hairline py-2 pr-4 text-left text-label font-medium text-muted first:pl-2";

/**
 * The visual legend's tables (node and edge styles): each style drawn as the diagram draws it — in the theme's
 * colours —, what it means with its chip, and its key.
 */
function LegendTable({ kind, rows }) {
  return (
    <Wide>
      <table className="w-full border-collapse text-ui">
        <thead>
          <tr>
            <th scope="col" className={cn(head, "w-24")}>
              Looks like
            </th>
            <th scope="col" className={head}>
              Means
            </th>
            <th scope="col" className={head}>
              Style
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const style = (kind === "nodes" ? NODE_STYLES : EDGE_STYLES)[row.key];
            return (
              <tr key={row.key}>
                <td className={cell}>
                  <span role="img" aria-label={plain(row.cells[1])} className="inline-flex">
                    {kind === "nodes" ?
                      <NodeSwatch fill={style.fill} stroke={style.stroke} dash={style.dash} />
                    : <EdgeSwatch styleKey={row.key} stroke={style.stroke} width={style.width} dash={style.dash} />}
                  </span>
                </td>
                <td className={cn(cell, "text-ink")}>
                  <Inline nodes={row.cells[2]} />
                  {style.chip && (
                    <span className="ml-2 rounded-chip border border-control-border px-1 py-px font-mono text-[10px] text-sub">
                      {style.chip}
                    </span>
                  )}
                </td>
                <td className={cn(cell, "font-mono text-label text-muted")}>{row.key}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Wide>
  );
}

/** A table; the rules table's rows can be linked to (`#rule-<code>`), and the one linked to is marked. */
function Table({ block, target }) {
  if (block.kind === "nodes" || block.kind === "edges") return <LegendTable kind={block.kind} rows={block.rows} />;
  return (
    <Wide>
      <table className="w-full border-collapse text-ui">
        <thead>
          <tr>
            {block.header.map((nodes, index) => (
              <th key={index} scope="col" className={head}>
                <Inline nodes={nodes} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, index) => (
            <tr
              key={row.id ?? index}
              id={row.id}
              aria-current={row.id && row.id === target ? "location" : undefined}
              className="aria-[current]:bg-accent-soft aria-[current]:shadow-[inset_2px_0_0_var(--accent)]"
            >
              {row.cells.map((nodes, column) => (
                <td key={column} className={cn(cell, "text-sub", column === 0 && "whitespace-nowrap")}>
                  {block.kind === "rules" && column === 1 ?
                    <Severity nodes={nodes} />
                  : <Inline nodes={nodes} />}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Wide>
  );
}

/** One block of the guide. */
function Block({ block, target }) {
  const { t } = useTranslation();
  switch (block.t) {
    case "h": {
      const Heading = `h${block.depth}`;
      return (
        <Heading id={block.id} className={HEADINGS[block.depth]}>
          <Inline nodes={block.c} />
        </Heading>
      );
    }
    case "p":
      return (
        <p className="mt-4 max-w-[70ch]">
          <Inline nodes={block.c} />
        </p>
      );
    case "text":
      return <Inline nodes={block.c} />;
    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List
          start={block.start}
          className={cn(
            "mt-3 max-w-[70ch] space-y-1.5 pl-5 marker:text-muted",
            block.ordered ? "list-decimal" : "list-disc"
          )}
        >
          {block.items.map((item, index) => (
            <li key={index} className="pl-1 [&>ol]:mt-1.5 [&>p]:mt-2 [&>ul]:mt-1.5">
              {item.map((child, at) => (
                <Block key={at} block={child} target={target} />
              ))}
            </li>
          ))}
        </List>
      );
    }
    case "figure":
      return (
        <figure className="mt-6 max-w-[880px]">
          <a
            href={asset(block.src)}
            target="_blank"
            rel="noreferrer"
            className="block rounded-control border border-hairline bg-white p-4 dark:border-transparent"
          >
            <img src={asset(block.src)} alt="" className="mx-auto h-auto max-w-full" />
            <span className="sr-only">{t("guide.fullSize")}</span>
          </a>
          <figcaption className="mt-2 text-ui text-muted">{block.alt}</figcaption>
        </figure>
      );
    case "table":
      return <Table block={block} target={target} />;
    case "code":
      return <Code text={block.v} />;
    default:
      return null;
  }
}

/**
 * The guide's content, as built from Core's README (scripts/guide.js).
 * @param {{ blocks: object[], target?: string }} props `target`: the id the address points at.
 */
export function Blocks({ blocks, target }) {
  return blocks.map((block, index) => <Block key={index} block={block} target={target} />);
}
