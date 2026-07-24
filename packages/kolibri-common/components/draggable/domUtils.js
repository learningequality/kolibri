// SortableJS reorders the DOM directly. To keep Vue's virtual DOM the single
// source of truth we revert that mutation and then drive the change through data,

/**
 * Remove a node from its parent, if it has one.
 * @param {HTMLElement} node - the node to detach from the DOM
 */
export function removeNode(node) {
  if (node.parentElement !== null) {
    node.parentElement.removeChild(node);
  }
}

/**
 * Insert a node into a parent at a given child position.
 * @param {HTMLElement} parent - the element to insert into
 * @param {HTMLElement} node - the node to insert
 * @param {number} position - the child index the node should occupy
 */
export function insertNodeAt(parent, node, position) {
  const refNode = position === 0 ? parent.children[0] : parent.children[position - 1].nextSibling;
  parent.insertBefore(node, refNode);
}
