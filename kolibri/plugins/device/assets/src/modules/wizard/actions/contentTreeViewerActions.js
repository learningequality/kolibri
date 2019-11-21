import sumBy from 'lodash/sumBy';
import map from 'lodash/fp/map';
import partition from 'lodash/partition';
import find from 'lodash/find';
import client from 'kolibri.client';
import urls from 'kolibri.urls';

const pluckIds = map('id');

function isDescendantOrSelf(testNode, selfNode) {
  return testNode.id === selfNode.id || find(testNode.path, { id: selfNode.id });
}

/**
 * Queries the server for the current total file size and resource count
 * and then sets it to the store.
 *
 * @returns {Promise}
 *
 */
function setImportExportFileSizeAndResourceCount(store) {
  const { transferredChannel, nodesForTransfer } = store.state;

  if (nodesForTransfer.included.length === 0 && nodesForTransfer.omitted.length === 0) {
    store.commit('SET_TRANSFER_SIZE', {
      transferFileSize: 0,
      transferResourceCount: 0,
    });
    return Promise.resolve();
  }

  const postArgs = {
    channel_id: transferredChannel.id,
    node_ids: nodesForTransfer.included.map(node => node.id),
    exclude_node_ids: nodesForTransfer.omitted.map(node => node.id),
  };
  if (store.getters['inLocalImportMode']) {
    const { selectedDrive } = store.state;
    postArgs.drive_id = selectedDrive.id;
  }
  if (store.getters['inPeerImportMode']) {
    const { selectedPeer } = store.state;
    postArgs.peer_id = selectedPeer.id;
  }
  if (store.getters['inExportMode']) {
    postArgs.export = true;
  }
  return client({
    path: urls['kolibri:kolibri.plugins.device:importexportsizeview'](),
    method: 'POST',
    entity: postArgs,
  }).then(response => {
    const { file_size, resource_count } = response.entity;
    store.commit('SET_TRANSFER_SIZE', {
      transferFileSize: file_size,
      transferResourceCount: resource_count,
    });
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
  const { included, omitted } = store.state.nodesForTransfer;
  // remove nodes in "omit" that are either descendants of new node or the node itself
  const [notToOmit, toOmit] = partition(omitted, omitNode => isDescendantOrSelf(omitNode, node));
  if (notToOmit.length > 0) {
    store.commit('REPLACE_OMIT_LIST', toOmit);
  }
  // remove nodes in "include" that would be made redundant by the new one
  const [notToIncluded, toInclude] = partition(included, includeNode =>
    isDescendantOrSelf(includeNode, node)
  );
  if (notToIncluded.length > 0) {
    store.commit('REPLACE_INCLUDE_LIST', toInclude);
  }
  store.commit('ADD_NODE_TO_INCLUDE_LIST', node);
  return setImportExportFileSizeAndResourceCount(store);
}

/**
 * Removes node from transfer list
 *
 * @param node {Node} - node to be removed
 *
 */
export function removeNodeForTransfer(store, node) {
  const forImport = !store.getters.inExportMode;
  const { included, omitted } = store.state.nodesForTransfer;
  // remove nodes in "include" that are either descendants of the removed node or the node itself
  const [notToInclude, toInclude] = partition(included, includeNode =>
    isDescendantOrSelf(includeNode, node)
  );
  if (notToInclude.length > 0) {
    store.commit('REPLACE_INCLUDE_LIST', toInclude);
  }
  // if the removed node's has ancestors that are selected, the removed node gets placed in "omit"
  const includedAncestors = included.filter(
    includeNode => pluckIds(node.path).includes(includeNode.id) && node.id !== includeNode.id
  );
  if (includedAncestors.length > 0) {
    // remove redundant nodes in "omit" that either descendants of the new node or the node itself
    const [notToOmit, toOmit] = partition(omitted, omitNode => isDescendantOrSelf(omitNode, node));
    if (notToOmit.length > 0) {
      store.commit('REPLACE_OMIT_LIST', toOmit);
    }
    store.commit('ADD_NODE_TO_OMIT_LIST', node);
    return setImportExportFileSizeAndResourceCount(store).then(() => {
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
          store.commit('REPLACE_INCLUDE_LIST', included.filter(n => n.id !== ancestor.id));
          // remove all desceandants from "omit"
          store.commit(
            'REPLACE_OMIT_LIST',
            omitted.filter(n => !pluckIds(n.path).includes(ancestor.id))
          );
        }
      });
    });
  }

  return setImportExportFileSizeAndResourceCount(store);
}
