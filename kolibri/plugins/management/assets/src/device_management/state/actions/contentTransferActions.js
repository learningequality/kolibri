import sumBy from 'lodash/sumBy';
import { selectedNodes } from '../getters';

/**
 * Adds a new node to the transfer list.
 *
 * @param store - Vuex store
 * @param node {Object} - node to be added
 * @param node.path {Array<String>} - path (via ids) from channel root to the node
 *
 */
export function addNodeForTransfer(store, newNode) {
  const { include } = selectedNodes(store.state);
  // remove nodes that would be made redundant by new one
  const deduplicatedNodes = include.filter(({ path }) => {
    return !path.includes(newNode.id)
  });
  if (include.length !== deduplicatedNodes.length) {
    store.dispatch('REPLACE_INCLUDE_LIST', deduplicatedNodes);
  }
  store.dispatch('ADD_NODE_TO_INCLUDE_LIST', newNode);
  store.dispatch('REMOVE_NODE_FROM_OMIT_LIST', newNode);
  updateTransferCounts(store);
}

/**
 * Removes node from transfer
 *
 * @param store - Vuex store
 * @param node {Node} - node to be removed
 *
 */
export function removeNodeForTransfer(store, node) {
  const { include } = selectedNodes(store.state);
  const ancestor = include.find(({ id }) => node.path.includes(id));
  if (ancestor) {
    store.dispatch('ADD_NODE_TO_OMIT_LIST', node);
  } else {
    store.dispatch('REMOVE_NODE_FROM_INCLUDE_LIST', node);
  }
  updateTransferCounts(store);
}

/**
 * After selectedItems.nodes is changed, run this to update
 * selectedItems.total_file_size/total_resource_count
 *
 * @param store - Vuex store
 *
 */
function updateTransferCounts(store) {
  const { include, omit } = selectedNodes(store.state);
  const resourcePath = 'totalResources';
  const fileSizePath = 'fileSize';
  const resources = sumBy(include, resourcePath) - sumBy(omit, resourcePath);
  const fileSize = sumBy(include, fileSizePath) - sumBy(omit, fileSizePath);
  store.dispatch('REPLACE_COUNTS', {
    fileSize,
    resources
  });
}
