// What the person answered, in words (collaboration spec §6.1).

/** An answer in words: the options chosen, the text, the elements marked. */
export function answerWords(line) {
  const { answer = {}, options = [] } = line;
  return [
    ...(answer.values ?? []).map(value => options.find(option => option.value === value)?.label ?? value),
    ...(answer.text ? [answer.text] : []),
    ...(answer.elements ?? []).map(item => item.name)
  ].join(", ");
}
