export default function expressionButtonSets(widgets = {}) {
  const buttonSets = new Set();
  for (const widget of Object.values(widgets)) {
    if (widget.type === 'expression') {
      for (const buttonSet of widget.options?.buttonSets || []) {
        buttonSets.add(buttonSet);
      }
    }
    for (const buttonSet of expressionButtonSets(widget.options?.widgets)) {
      buttonSets.add(buttonSet);
    }
  }
  return [...buttonSets];
}
