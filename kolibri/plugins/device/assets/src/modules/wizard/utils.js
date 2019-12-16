import { RemoteChannelResource, TaskResource } from 'kolibri.resources';
import coreStore from 'kolibri.coreVue.vuex.store';
import { ErrorTypes } from '../../constants';
import { waitForTaskToComplete } from '../manageContent/utils';
import { getChannelWithContentSizes } from './apiChannelMetadata';

/**
 * Makes request to RemoteChannel API with a token. Does not actually interact
 * with Vuex store.
 *
 * @param {string} token -
 * @returns Promise
 */
export function getRemoteChannelByToken(token) {
  return RemoteChannelResource.fetchModel({ id: token, force: true });
}

export function getRemoteChannelBundleByToken(token) {
  return RemoteChannelResource.fetchChannelList(token);
}

/**
 * Starts Task that downloads a Channel Metadata database.
 * NOTE: cannot be normally dispatched as an action, since it uses
 * waitForTaskToComplete (which relies on the store singleton with a .watch method)
 *
 */
export function downloadChannelMetadata(store = coreStore) {
  const { transferredChannel, selectedDrive, selectedPeer } = store.state.manageContent.wizard;
  let promise;
  if (store.getters['manageContent/wizard/inLocalImportMode']) {
    promise = TaskResource.startDiskChannelImport({
      channel_id: transferredChannel.id,
      drive_id: selectedDrive.id,
    });
  } else if (store.getters['manageContent/wizard/inRemoteImportMode']) {
    promise = TaskResource.startRemoteChannelImport({
      channel_id: transferredChannel.id,
    });
  } else if (store.getters['manageContent/wizard/inPeerImportMode']) {
    promise = TaskResource.startRemoteChannelImport({
      channel_id: transferredChannel.id,
      peer_id: selectedPeer.id,
    });
  } else {
    return Error('Channel Metadata is only downloaded when importing');
  }
  store.commit('CORE_SET_PAGE_LOADING', false);
  promise = promise.catch(() => Promise.reject({ errorType: ErrorTypes.CONTENT_DB_LOADING_ERROR }));

  return promise
    .then(task => {
      // NOTE: store.watch is not available to dispatched actions
      return waitForTaskToComplete(task.entity.id, store);
    })
    .then(completedTask => {
      const { taskId, cancelled } = completedTask;
      if (taskId && !cancelled) {
        return TaskResource.deleteFinishedTask(taskId)
          .then(() => {
            return getChannelWithContentSizes(transferredChannel.id);
          })
          .catch(() => {
            // Fail silently just in case something happens
            return getChannelWithContentSizes(transferredChannel.id);
          });
      }
      return Promise.reject({ errorType: ErrorTypes.CHANNEL_TASK_ERROR });
    });
}
