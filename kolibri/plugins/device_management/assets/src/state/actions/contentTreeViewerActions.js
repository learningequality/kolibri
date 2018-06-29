import sumBy from 'lodash/sumBy';
import map from 'lodash/fp/map';
import partition from 'lodash/partition';
import find from 'lodash/find';
import { ContentNodeGranularResource } from 'kolibri.resources';
import { selectedNodes, inExportMode } from '../getters';

const pluckIds = map('id');

function isDescendantOrSelf(testNode, selfNode) {
  return testNode.id === selfNode.id || find(testNode.path, { id: selfNode.id });
}

/**
 * Queries the server for a ContentNode's file sizes
 *
 * @param node {Node} - (sanitized) Node, which has resource, but not file sizes
 * @returns {Promise<{total_file_size, on_device_file_size}>}
 *
 */
export function getContentNodeFileSize(node) {
  return ContentNodeGranularResource.getFileSizes(node.id).then(({ entity }) => {
    return entity;
  });
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
  return getContentNodeFileSize(node).then(fileSizes => {
    store.dispatch('ADD_NODE_TO_INCLUDE_LIST', {
      ...node,
      ...fileSizes,
    });
  });
}

/**
 * Removes node from transfer list
 *
 * @param node {Node} - node to be removed
 *
 */
export function removeNodeForTransfer(store, node) {
  let promise = Promise.resolve();
  const forImport = !inExportMode(store.state);
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
    includeNode => pluckIds(node.path).includes(includeNode.id) && node.id !== includeNode.id
  );
  if (includedAncestors.length > 0) {
    // remove redundant nodes in "omit" that either descendants of the new node or the node itself
    const [notToOmit, toOmit] = partition(omitted, omitNode => isDescendantOrSelf(omitNode, node));
    if (notToOmit.length > 0) {
      store.dispatch('REPLACE_OMIT_LIST', toOmit);
    }
    promise = getContentNodeFileSize(node)
      .then(fileSizes => {
        store.dispatch('ADD_NODE_TO_OMIT_LIST', {
          ...node,
          ...fileSizes,
        });
      })
      .then(() => {
        // loop through the ancestor list and remove any that have been completely un-selected
        includedAncestors.forEach(ancestor => {
          let omittedResources;
          let ancestorResources;
          const omittedDescendants = omitted.filter(n => pluckIds(n.path).includes(ancestor.id));
          if (forImport) {
            // When total_resources === on_device_resources, then that node is not selectable.
            // So we need to compare the difference (i.e  # of transferrable nodes) when
            // deciding whether parent is fully omitted.
            ancestorResources = ancestor.total_resources - ancestor.on_device_resources;
            omittedResources =
              sumBy(omittedDescendants, 'total_resources') -
              sumBy(omittedDescendants, 'on_device_resources');
          } else {
            ancestorResources = ancestor.on_device_resources;
            omittedResources = sumBy(omittedDescendants, 'on_device_resources');
          }
          if (ancestorResources === omittedResources) {
            // remove the ancestor from "include"
            store.dispatch('REPLACE_INCLUDE_LIST', included.filter(n => n.id !== ancestor.id));
            // remove all desceandants from "omit"
            store.dispatch(
              'REPLACE_OMIT_LIST',
              omitted.filter(n => !pluckIds(n.path).includes(ancestor.id))
            );
          }
        });
      });
  }

  return promise;
}
