import RemoteChannelResource from 'kolibri-common/apiResources/RemoteChannelResource';
import TaskResource from 'kolibri/apiResources/TaskResource';
import coreStore from 'kolibri/store';
import { TaskTypes } from 'kolibri-common/utils/syncTaskUtils';
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
  return RemoteChannelResource.fetchCollection({ getParams: { token } });
}

/**
 * Starts Task that downloads a Channel Metadata database.
 * NOTE: cannot be normally dispatched as an action, since it uses
 * waitForTaskToComplete (which relies on the store singleton with a .watch method)
 *
 */
export function downloadChannelMetadata(store = coreStore) {
  if (
    !store.getters['manageContent/wizard/inLocalImportMode'] &&
    !store.getters['manageContent/wizard/inRemoteImportMode'] &&
    !store.getters['manageContent/wizard/inPeerImportMode']
  ) {
    throw Error('Channel Metadata is only downloaded when importing');
  }
  const { transferredChannel, selectedDrive, selectedPeer } = store.state.manageContent.wizard;
  const taskParams = {
    channel_id: transferredChannel.id,
    channel_name: transferredChannel.name,
    type: store.getters['manageContent/wizard/inLocalImportMode']
      ? TaskTypes.DISKCHANNELIMPORT
      : TaskTypes.REMOTECHANNELIMPORT,
  };
  if (store.getters['manageContent/wizard/inLocalImportMode']) {
    taskParams.drive_id = selectedDrive.id;
  } else if (store.getters['manageContent/wizard/inPeerImportMode']) {
    taskParams.peer = selectedPeer.id;
  }
  store.commit('CORE_SET_PAGE_LOADING', false);

  return TaskResource.startTask(taskParams)
    .catch(() => Promise.reject({ errorType: ErrorTypes.CONTENT_DB_LOADING_ERROR }))
    .then(task => {
      // NOTE: store.watch is not available to dispatched actions
      return waitForTaskToComplete(task.id, store);
    })
    .then(completedTask => {
      const { taskId, cancelled } = completedTask;
      if (taskId && !cancelled) {
        return TaskResource.clear(taskId)
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
