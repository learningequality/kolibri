import sumBy from 'lodash/sumBy';
import { selectedNodes } from '../getters';
import { TaskResource, ContentNodeGranularResource } from 'kolibri.resources';
import { TaskStatuses, TransferTypes } from '../../constants';

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
      channel_id: channel.id
    });
  }
  return promise
    .catch(() => {
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
        TaskResource.getCollection().fetch({}, true)
          .then((tasks) => {
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
          }, () => {
            clearInterval(poller);
            reject({ errorType: 'TASK_POLLING_ERROR' });
          });
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
    }
    if (options.transferType === TransferTypes.LOCALIMPORT) {
      fetchArgs.drive_id = source.driveId
    }
    return ContentNodeGranularResource.getModel(topic.id).fetch(fetchArgs)
      .catch(() => Promise.reject({ errorType: 'TREEVIEW_LOADING_ERROR' }));
}

/**
 * Transitions the import/export wizard to the 'select-content-page'
 *
 * @param store - Vuex store
 * @param {Object} options
 * @param {Object} options.channel - { id, title, isOnDevice }
 * @param {string} options.transferType - 'remoteimport', 'localimport', or 'localexport'
 * @param {Object} options.source - LocalDrive { driveId, driveName } | RemoteSource
 * @param {Object} options.taskPollInterval
 *
 */
export function showSelectContentPage(store, options) {
  const { channel } = options;
  let dbPromise;

  store.dispatch('ADD_TREEVIEW_BREADCRUMB', {
    id: channel.root,
    title: channel.title,
  });

  if (channel.isOnDevice) {
    // If already on device, then skip the DB-download
    dbPromise = Promise.resolve();
  } else {
    dbPromise = downloadContentDatabase(options)
      .then((task) => {
        // Wait until database is downloaded
        return waitForTaskToComplete(store, task.id, options.taskPollInterval);
      });
  }

  return dbPromise.then(() => {
    // For channels, ContentNodeGranular API requires the channel root, not the id
    return getTopicContents(store, { id: channel.root }, options);
  })
  .then((channelContents) => {
    // Then hydrate pageState.treeView with the contents
    store.dispatch('SET_TREEVIEW_CURRENTNODE', channelContents);
  })
  .catch(({ errorType }) => {
    return store.dispatch('SELECT_CONTENT_PAGE_ERROR', errorType);
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
  const { include } = selectedNodes(store.state);
  // remove nodes in "include" that would be made redundant by the new one
  const nonRedundantNodes = include.filter(({ path }) => !path.includes(node.id));
  if (include.length !== nonRedundantNodes.length) {
    store.dispatch('REPLACE_INCLUDE_LIST', nonRedundantNodes);
  }
  store.dispatch('ADD_NODE_TO_INCLUDE_LIST', node);
  store.dispatch('REMOVE_NODE_FROM_OMIT_LIST', node);
  updateTransferCounts(store);
}

/**
 * Removes node from transfer
 *
 * @param node {Node} - node to be removed
 *
 */
export function removeNodeForTransfer(store, node) {
  const { include } = selectedNodes(store.state);
  const includedAncestor = include.find(({ id }) => node.path.includes(id));
  if (includedAncestor) {
    store.dispatch('ADD_NODE_TO_OMIT_LIST', node);
  } else {
    store.dispatch('REMOVE_NODE_FROM_INCLUDE_LIST', node);
  }
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
    fileSize: getDifference('fileSize'),
    resources: getDifference('totalResources'),
  });
}

/**
 * Updates the treeView part of the wizardState when going to new topic.
 *
 * @param {Object} topic - { id, title }
 *
 */
export function goToTopic(store, topic) {
  const { source, transferType } = store.state.pageState.wizardState;
  return getTopicContents(store, topic, { source, transferType })
    .then(contents => {
      store.dispatch('SET_TREEVIEW_CURRENTNODE', contents);
      store.dispatch('ADD_TREEVIEW_BREADCRUMB', topic);
      store.dispatch('ADD_ID_TO_PATH', topic.id);
    })
    .catch(({ errorType }) => {
      return store.dispatch('SELECT_CONTENT_PAGE_ERROR', errorType);
    });
}
