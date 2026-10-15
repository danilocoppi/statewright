import { useEffect, useState } from "react";

/** How far below the top of the window a heading counts as the one being read. */
const READING_LINE = 120;

/** The last of these headings that has reached the reading line, or null. */
function reached(ids) {
  let found = null;
  for (const id of ids) {
    const element = document.getElementById(id);
    if (element && element.getBoundingClientRect().top <= READING_LINE) found = id;
  }
  return found;
}

/**
 * The section and subsection being read: the last heading of each level above the reading line, followed as the page
 * scrolls (measured once per frame).
 * @param {{ id: string, children: { id: string }[] }[]} sections
 * @returns {{ section: string | null, sub: string | null }}
 */
export function useSection(sections) {
  const [current, setCurrent] = useState({ section: null, sub: null });
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const section = reached(sections.map(item => item.id));
      const children = sections.find(item => item.id === section)?.children ?? [];
      const sub = reached(children.map(child => child.id));
      setCurrent(now => (now.section === section && now.sub === sub ? now : { section, sub }));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [sections]);
  return current;
}
