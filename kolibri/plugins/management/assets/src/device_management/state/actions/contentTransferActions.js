import { selectedNodes } from '../getters';
import { TaskResource, ContentNodeGranularResource } from 'kolibri.resources';
import { TaskStatuses, TransferTypes } from '../../constants';
import sumBy from 'lodash/sumBy';
import partition from 'lodash/partition';
import omit from 'lodash/omit';

/**
 * Starts Task that downloads content database
 *
 * @param {Object} options - { transferType, channel, source }
 *
 */
function downloadContentDatabase(options) {
  const { transferType, channel, source } = options;
  let promise;
  if (transferType === TransferTypes.LOCALIMPORT) {
    promise = TaskResource.startLocalChannelImport({
      channel_id: channel.id,
      drive_id: source.driveId,
    });
  } else if (transferType === TransferTypes.REMOTEIMPORT) {
    promise = TaskResource.startRemoteChannelImport({
      channel_id: channel.id,
    });
  }
  return promise.catch(() => {
    return Promise.reject({ errorType: 'CONTENT_DB_LOADING_ERROR' });
  });
}

/**
 * Repeatedly polls /api/task until the task is done, then resolves
 */
function waitForTaskToComplete(store, taskId, interval = 1000) {
  let shouldPoll = true;
  return new Promise((resolve, reject) => {
    const poller = setInterval(function pollTasks() {
      if (shouldPoll) {
        shouldPoll = false;
        TaskResource.getCollection()
          .fetch({}, true)
          .then(
            tasks => {
              const match = tasks.find(task => task.id === taskId);
              if (!match) {
                clearInterval(poller);
                reject({ errorType: 'TASK_POLLING_ERROR' });
              } else if (match.status === TaskStatuses.COMPLETED) {
                clearInterval(poller);
                store.dispatch('UPDATE_SELECT_CONTENT_PAGE_TASK', match);
                resolve();
              } else {
                shouldPoll = true;
              }
            },
            () => {
              clearInterval(poller);
              reject({ errorType: 'TASK_POLLING_ERROR' });
            }
          );
      }
    }, interval);
  });
}

/**
 * Makes call to ContentNodeGranular API and gets top-level contents for a topic
 *
 * @param {Object} topic - { id }
 * @param {Object} options - { transferType, source }
 *
 */
function getTopicContents(store, topic, options) {
  const { source, transferType } = options;
  const fetchArgs = {
    import_export: transferType === TransferTypes.LOCALEXPORT ? 'export' : 'import',
  };
  if (options.transferType === TransferTypes.LOCALIMPORT) {
    fetchArgs.drive_id = source.driveId;
  }
  return ContentNodeGranularResource.getModel(topic.pk)
    .fetch(fetchArgs)
    .catch(() => Promise.reject({ errorType: 'TREEVIEW_LOADING_ERROR' }));
}

/**
 * Transitions the import/export wizard to the 'select-content-page'
 *
 * @param store - Vuex store
 * @param {Object} options
 * @param {Object} options.channel - { id, title, root, isOnDevice }
 * @param {string} options.transferType - 'remoteimport', 'localimport', or 'localexport'
 * @param {Object} options.source - LocalDrive { driveId, driveName } | RemoteSource
 * @param {Object} options.taskPollInterval
 *
 */
export function showSelectContentPage(store, options) {
  const { channel } = options;
  let dbPromise;

  if (channel.isOnDevice) {
    // If already on device, then skip the DB-download
    dbPromise = Promise.resolve();
  } else {
    dbPromise = downloadContentDatabase(options).then(task => {
      // Wait until database is downloaded
      return waitForTaskToComplete(store, task.id, options.taskPollInterval);
    });
  }

  return dbPromise
    .then(() => {
      // For channels, ContentNodeGranular API requires the channel root, not the id
      return updateTreeViewTopic(store, { title: channel.name, pk: channel.root });
    })
    .then(() => {
      store.dispatch('SET_CONTENT_PAGE_WIZARD_PAGENAME', 'SELECT_CONTENT');
    })
    .catch(({ errorType }) => {
      return store.dispatch('SELECT_CONTENT_PAGE_ERROR', errorType);
    });
}

function isDescendantOrSelf(testNode, selfNode) {
  return testNode.pk === selfNode.pk || testNode.path.includes(selfNode.pk);
}

// removes annotations and other stuff added to nodes in UI
function sanitizeNode(node) {
  return omit(node, ['message', 'checkboxType', 'disabled', 'children']);
}

/**
 * Adds a new node to the transfer list.
 *
 * @param node {Node} - Node to be added
 * @param node.path {Array<String>} - path (via ids) from channel root to the Node
 *
 */
export function addNodeForTransfer(store, node) {
  const { include, omit } = selectedNodes(store.state);
  // remove nodes in "omit" that are either descendants of new node or the node itself
  const [notOmitted, omitted] = partition(omit, omitNode => isDescendantOrSelf(omitNode, node));
  if (notOmitted.length > 0) {
    store.dispatch('REPLACE_OMIT_LIST', omitted);
  }
  // remove nodes in "include" that would be made redundant by the new one
  const [notIncluded, included] = partition(include, includeNode => isDescendantOrSelf(includeNode, node));
  if (notIncluded.length > 0) {
    store.dispatch('REPLACE_INCLUDE_LIST', included);
  }
  store.dispatch('ADD_NODE_TO_INCLUDE_LIST', sanitizeNode(node));
  updateTransferCounts(store);
}

/**
 * Removes node from transfer list
 *
 * @param node {Node} - node to be removed
 *
 */
export function removeNodeForTransfer(store, node) {
  const { include, omit } = selectedNodes(store.state);
  // remove nodes in "include" that are either descendants of the removed node or the node itself
  const [notIncluded, included] = partition(include, includeNode => isDescendantOrSelf(includeNode, node));
  if (notIncluded.length > 0) {
    store.dispatch('REPLACE_INCLUDE_LIST', included);
  }
  // if the removed node's has ancestors that are selected, the removed node gets placed in "omit"
  const includedAncestors = include.filter(includeNode => node.path.includes(includeNode.pk) && node.pk !== includeNode.pk);
  if (includedAncestors.length > 0) {
    // remove redundant nodes in "omit" that either descendants of the new node or the node itself
    const [notOmitted, omitted] = partition(omit, omitNode => isDescendantOrSelf(omitNode, node));
    if (notOmitted.length > 0) {
      store.dispatch('REPLACE_OMIT_LIST', omitted);
    }
    store.dispatch('ADD_NODE_TO_OMIT_LIST', sanitizeNode(node));
  }

  // loop through the ancestor list and remove any that have been completely un-selected
  includedAncestors.forEach(ancestor => {
    const ancestorResources = ancestor.total_resources - ancestor.resources_on_device;
    const omitted = omit.filter(n => n.path.includes(ancestor.pk));
    const omittedResources = sumBy(omitted, 'total_resources') - sumBy(omitted, 'resources_on_device');
    if (ancestorResources === omittedResources) {
      // remove the ancestor from "include"
      store.dispatch('REPLACE_INCLUDE_LIST', include.filter(n => n.pk !== ancestor.pk));
      // remove all desceandants from "omit"
      store.dispatch('REPLACE_OMIT_LIST', omit.filter(n => !n.path.includes(ancestor.pk)));
    }
  });
  updateTransferCounts(store);
}

/**
 * After selectedItems.nodes is changed, this function is run to update
 * selectedItems.total_file_size/total_resource_count.
 *
 */
function updateTransferCounts(store) {
  const { include, omit } = selectedNodes(store.state);
  const getDifference = path => sumBy(include, path) - sumBy(omit, path);
  store.dispatch('REPLACE_COUNTS', {
    fileSize: getDifference('total_resources') - getDifference('resources_on_device'),
    resources: getDifference('total_resources') - getDifference('resources_on_device'),
  });
}

/**
 * Updates wizardState.treeView when a new topic is clicked.
 *
 * @param {Object} topic - { pk, title }
 *
 */
export function updateTreeViewTopic(store, topic, resetPath = false) {
  const { source, transferType } = store.state.pageState.wizardState.meta;
  return getTopicContents(store, topic, { source, transferType })
    .then(contents => {
      store.dispatch('SET_TREEVIEW_CURRENTNODE', contents);
      if (resetPath) {
        store.dispatch('PULL_PATH_BREADCRUMBS_BACK', topic.pk);
      } else {
        // TODO combine as 'PUSH_PATH_BREADCRUMBS_FORWARD'
        store.dispatch('ADD_TREEVIEW_BREADCRUMB', topic);
        store.dispatch('ADD_ID_TO_PATH', topic.pk);
      }
    })
    .catch(({ errorType }) => {
      return store.dispatch('SELECT_CONTENT_PAGE_ERROR', errorType);
    });
}
