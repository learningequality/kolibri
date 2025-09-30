export default {
  name: 'SafeHtmlTable',
  functional: true,
  props: {
    node: { required: true },
    attributes: { type: Object, required: true },
    tableCounter: { type: Number, required: true },
    windowSizeClass: { type: String, default: '' },
    mapNode: { type: Function, required: true },
    mapChildren: { type: Function, required: true },
  },
  render(h, context) {
    const { node, attributes, tableCounter, windowSizeClass, mapNode, mapChildren } = context.props;
    const captionId = `table-caption-${tableCounter}`;

    const children = [];
    for (const childNode of node.childNodes) {
      if (
        childNode.nodeType === Node.ELEMENT_NODE &&
        childNode.tagName.toLowerCase() === 'caption'
      ) {
        const captionAttrs = {};
        for (const attr of childNode.attributes) {
          captionAttrs[attr.name] = attr.value;
        }
        captionAttrs.id = captionId;
        captionAttrs.class = windowSizeClass ? `safe-html ${windowSizeClass}` : 'safe-html';
        children.push(h('caption', { attrs: captionAttrs }, mapChildren(childNode.childNodes)));
      } else {
        children.push(mapNode(childNode));
      }
    }

    const firstRow = node.querySelector && node.querySelector('tr');
    const colCount = firstRow ? firstRow.children.length : 0;
    let tableWidth = '640px';
    if (colCount > 3) {
      tableWidth = `${colCount * 200}px`;
    }

    return h(
      'div',
      {
        class: 'table-container',
        attrs: {
          role: 'region',
          'aria-labelledby': captionId,
          'data-testid': 'table-container',
        },
      },
      [h('table', { attrs: attributes, style: { width: tableWidth } }, children)],
    );
  },
};
