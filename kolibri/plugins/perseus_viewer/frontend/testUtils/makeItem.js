export function renderer(widgets) {
  return {
    content: Object.keys(widgets)
      .map(id => `[[☃ ${id}]]`)
      .join(' '),
    images: {},
    widgets,
  };
}

export function rawItem(widgets, hints = []) {
  return {
    question: renderer(widgets),
    answerArea: {},
    hints,
    itemDataVersion: { major: 0, minor: 1 },
  };
}
