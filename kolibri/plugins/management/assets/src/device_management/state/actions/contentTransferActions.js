import { channelIsInstalled, selectedNodes } from '../getters';
import { ChannelResource, TaskResource, ContentNodeGranularResource } from 'kolibri.resources';
import { TaskStatuses, TransferTypes } from '../../constants';
import sumBy from 'lodash/sumBy';
import partition from 'lodash/partition';
import omit from 'lodash/omit';

const ErrorTypes = {
  CONTENT_DB_LOADING_ERROR: 'CONTENT_DB_LOADING_ERROR',
  TASK_POLLING_ERROR: 'TASK_POLLING_ERROR',
  TREEVIEW_LOADING_ERROR: 'TREEVIEW_LOADING_ERROR',
};

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
    promise = TaskResource.startDiskChannelImport({
      channel_id: channel.id,
      drive_id: source.driveId,
    });
  } else if (transferType === TransferTypes.REMOTEIMPORT) {
    promise = TaskResource.startRemoteChannelImport(channel.id);
  }
  return promise.catch(() => {
    return Promise.reject({ errorType: ErrorTypes.CONTENT_DB_LOADING_ERROR });
  });
}

function taskList(state) {
  return state.pageState.taskList;
}

/**
 * Watches the pageState.taskList and resolves when the tracked Task
 * is COMPLETED.
 */
function waitForTaskToComplete(store, taskId) {
  return new Promise((resolve, reject) => {
    const stopWatching = store.watch(taskList, function checkTaskProgress(tasks) {
      const match = tasks.find(task => task.id === taskId);
      if (!match || match.status === TaskStatuses.FAILED) {
        stopWatching();
        reject({ errorType: ErrorTypes.TASK_POLLING_ERROR });
      } else if (match.status === TaskStatuses.COMPLETED) {
        stopWatching();
        resolve(taskId);
      }
    });
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
    .catch(() => Promise.reject({ errorType: ErrorTypes.TREEVIEW_LOADING_ERROR }));
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
  let dbPromise;
  const channelOnDevice = channelIsInstalled(store.state)(options.channel.id);

  store.dispatch('SET_CONTENT_PAGE_WIZARD_PAGENAME', 'SELECT_CONTENT');

  if (channelOnDevice) {
    // If already on device, then skip the DB download, and use on-device
    // Channel metadata, since it has root id.
    dbPromise = Promise.resolve(channelOnDevice);
  } else {
    dbPromise = downloadContentDatabase(options)
      .then(task => {
        return waitForTaskToComplete(store, task.entity.id);
      })
      .then(taskId => {
        return TaskResource.cancelTask(taskId)
          .then(() => {
            // Get ChannelMetadata from /api/channel because it has the root_id
            return ChannelResource.getModel(options.channel.id).fetch()._promise;
          })
          .catch(() => {
            return Promise.reject({ errorType: 'TASK_ID_FETCH_ERROR' });
          });
      });
  }

  return dbPromise
    .then(channel => {
      // For channels, ContentNodeGranular API requires the channel root, not the id
      console.log(channel);
      return updateTreeViewTopic(store, { title: channel.name, pk: channel.root });
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
  const [notIncluded, included] = partition(include, includeNode =>
    isDescendantOrSelf(includeNode, node)
  );
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
  const [notIncluded, included] = partition(include, includeNode =>
    isDescendantOrSelf(includeNode, node)
  );
  if (notIncluded.length > 0) {
    store.dispatch('REPLACE_INCLUDE_LIST', included);
  }
  // if the removed node's has ancestors that are selected, the removed node gets placed in "omit"
  const includedAncestors = include.filter(
    includeNode => node.path.includes(includeNode.pk) && node.pk !== includeNode.pk
  );
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
    const omittedResources =
      sumBy(omitted, 'total_resources') - sumBy(omitted, 'resources_on_device');
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
