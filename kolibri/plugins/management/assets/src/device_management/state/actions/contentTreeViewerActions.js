import sumBy from 'lodash/sumBy';
import map from 'lodash/fp/map';
import partition from 'lodash/partition';
import find from 'lodash/find';
import { selectedNodes } from '../getters';

const pluckPks = map('pk');

function isDescendantOrSelf(testNode, selfNode) {
  return testNode.pk === selfNode.pk || find(testNode.path, { pk: selfNode.pk });
}

/**
 * Adds a new node to the transfer list.
 *
 * @param node {Node} - Node to be added
 * @param node.path {Array<String>} - path (via ids) from channel root to the Node
 *
 */
export function addNodeForTransfer(store, node) {
  const { included, omitted } = selectedNodes(store.state);
  // remove nodes in "omit" that are either descendants of new node or the node itself
  const [notToOmit, toOmit] = partition(omitted, omitNode => isDescendantOrSelf(omitNode, node));
  if (notToOmit.length > 0) {
    store.dispatch('REPLACE_OMIT_LIST', toOmit);
  }
  // remove nodes in "include" that would be made redundant by the new one
  const [notToIncluded, toInclude] = partition(included, includeNode =>
    isDescendantOrSelf(includeNode, node)
  );
  if (notToIncluded.length > 0) {
    store.dispatch('REPLACE_INCLUDE_LIST', toInclude);
  }
  store.dispatch('ADD_NODE_TO_INCLUDE_LIST', node);
}

/**
 * Removes node from transfer list
 *
 * @param node {Node} - node to be removed
 *
 */
export function removeNodeForTransfer(store, node) {
  const { included, omitted } = selectedNodes(store.state);
  // remove nodes in "include" that are either descendants of the removed node or the node itself
  const [notToInclude, toInclude] = partition(included, includeNode =>
    isDescendantOrSelf(includeNode, node)
  );
  if (notToInclude.length > 0) {
    store.dispatch('REPLACE_INCLUDE_LIST', toInclude);
  }
  // if the removed node's has ancestors that are selected, the removed node gets placed in "omit"
  const includedAncestors = included.filter(
    includeNode => pluckPks(node.path).includes(includeNode.pk) && node.pk !== includeNode.pk
  );
  if (includedAncestors.length > 0) {
    // remove redundant nodes in "omit" that either descendants of the new node or the node itself
    const [notToOmit, toOmit] = partition(omitted, omitNode => isDescendantOrSelf(omitNode, node));
    if (notToOmit.length > 0) {
      store.dispatch('REPLACE_OMIT_LIST', toOmit);
    }
    store.dispatch('ADD_NODE_TO_OMIT_LIST', node);
  }

  // loop through the ancestor list and remove any that have been completely un-selected
  includedAncestors.forEach(ancestor => {
    const ancestorResources = ancestor.total_resources - ancestor.on_device_resources;
    const toOmit = omitted.filter(n => pluckPks(n.path).includes(ancestor.pk));
    // When total_resources === on_device_resources, then that node is not selectable.
    // So we need to compare the difference (i.e  # of transferrable nodes) when
    // deciding whether parent is fully omitted.
    const omittedResources =
      sumBy(toOmit, 'total_resources') - sumBy(omitted, 'on_device_resources');
    if (ancestorResources === omittedResources) {
      // remove the ancestor from "include"
      store.dispatch('REPLACE_INCLUDE_LIST', included.filter(n => n.pk !== ancestor.pk));
      // remove all desceandants from "omit"
      store.dispatch(
        'REPLACE_OMIT_LIST',
        omitted.filter(n => !pluckPks(n.path).includes(ancestor.pk))
      );
    }
  });
}
