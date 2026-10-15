// What the dock's guest tools ask before their box is added (mixed levels spec §6): the party a participant is, the
// state a state guest stands for.

/** The parties a participant tool offers: the parties of its kind (operators with people), by name. */
const PARTY_KINDS = { human: ["human", "operator"], system: ["system"], external: ["external"] };

/**
 * The parties that match what is typed — the tool's kind first, then the others, which say their kind — and a new one
 * of the tool's kind when no party has that name.
 */
export function partyOptions(t, doc, tool, onPick) {
  return query => {
    const typed = query.trim();
    const kinds = PARTY_KINDS[tool.partyKind] ?? [];
    const found = Object.entries(doc.catalog.parties)
      .filter(([, party]) => party.name.toLowerCase().includes(typed.toLowerCase()))
      .sort(
        ([, a], [, b]) =>
          Number(!kinds.includes(a.kind)) - Number(!kinds.includes(b.kind)) || a.name.localeCompare(b.name)
      )
      .slice(0, 6);
    const known = Object.values(doc.catalog.parties).some(party => party.name === typed);
    return [
      ...(typed && !known ?
        [
          {
            id: "create",
            create: true,
            label: t("tools.createParty", { name: typed }),
            onPick: () => onPick({ party: { name: typed } })
          }
        ]
      : []),
      ...found.map(([id, party]) => ({
        id,
        label: party.name,
        ...(kinds.includes(party.kind) ? {} : { meta: t(`inspector:choices.partyKind.${party.kind}`) }),
        onPick: () => onPick({ party: { id } })
      }))
    ];
  };
}

/** The states of the document's state machines that match what is typed, each with its level's name. */
export function stateOptions(doc, onPick) {
  return query => {
    const typed = query.trim().toLowerCase();
    return Object.values(doc.canvases)
      .filter(canvas => canvas.kind === "machine")
      .flatMap(canvas =>
        Object.entries(canvas.nodes)
          .filter(([, node]) => node.kind === "state" && node.name.toLowerCase().includes(typed))
          .map(([id, node]) => ({ id, label: node.name, meta: canvas.name, onPick: () => onPick({ target: id }) }))
      )
      .slice(0, 8);
  };
}
