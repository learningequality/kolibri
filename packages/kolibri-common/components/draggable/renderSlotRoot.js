import logger from 'kolibri-logging';

const logging = logger.getLogger(__filename);

/**
 * Render a draggable component's slot content as it was written, adding the SortableJS
 * marker classes to the consumer's own element rather than wrapping it in one. The
 * consumer therefore chooses the element — `<tbody>`, `<ul>`, `<tr>`, `<li>` — by
 * writing it, and its class, style, and attribute bindings stay on it.
 * @param {import('vue').default} vm - the component instance rendering its slot
 * @param {string|object|Array} [classes] - classes to add to the rendered element, in
 * any form Vue's class binding accepts
 * @returns {?import('vue').VNode} the slot's root node, or null when the slot is empty
 */
export default function renderSlotRoot(vm, classes) {
  // whitespace text and `v-if` placeholders carry no tag
  const nodes = (vm.$slots.default || []).filter(node => node.tag);
  if (!nodes.length) {
    return null;
  }
  if (nodes.length > 1) {
    logging.warn(
      `<${vm.$options.name}> renders a single root element; the rest of its slot is ignored`,
    );
  }
  const [root] = nodes;
  if (classes) {
    // The parent re-renders whenever these components do, so this is applied to a
    // fresh vnode each time rather than accumulating on one.
    const data = root.data || (root.data = {});
    data.class = [data.class, classes];
  }
  return root;
}
