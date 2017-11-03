import sumBy from 'lodash/sumBy';
import { selectedNodes } from '../getters';
import { TaskResource, ContentNodeGranularResource } from 'kolibri.resources';
import { TaskStatuses } from '../../constants';

/**
 * Starts Task that downloads content database
 */
function downloadContentDatabase(options) {
  const { transferType, channel, source } = options;
  let promise;
  if (transferType === 'localimport') {
    promise = TaskResource.startLocalChannelImport({
      channel_id: channel.id,
      drive_id: source.driveId,
    });
  } else if (transferType === 'remoteimport') {
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
 */
function getTopicContents(store, topicId, options) {
    const fetchArgs = {
      import_export: options.transferType === 'localexport' ? 'export' : 'import',
    }
    if (options.transferType === 'localimport') {
      fetchArgs.drive_id = options.source.driveId
    }
    return ContentNodeGranularResource.getModel(topicId).fetch(fetchArgs)
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
    return getTopicContents(store, channel.root, options);
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

/**
 * Handles clicking a new topic on the tree-view
 *
 * @param {Object} options
 * @param {Object} options.topic - { id, title, source }
 * @param {Object} options.source
 *
 */
export function goToTopic(store, options) {
  const { topic } = options;
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
