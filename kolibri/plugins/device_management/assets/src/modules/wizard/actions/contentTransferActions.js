import { TaskResource } from 'kolibri.resources';
import { waitForTaskToComplete } from '../../manageContent/utils';

/**
 * Starts a Task that transfers Channel ContentNodes to/from a drive
 *
 */
export function transferChannelContent(store, callback) {
  const combineIds = nodes => nodes.map(({ id }) => id);
  const { transferredChannel, selectedDrive, nodesForTransfer, selectedPeer } = store.state;
  const params = {
    channel_id: transferredChannel.id,
    node_ids: combineIds(nodesForTransfer.included),
    exclude_node_ids: combineIds(nodesForTransfer.omitted),
  };

  if (store.getters.inRemoteImportMode) {
    return TaskResource.startRemoteContentImport(params)
      .then(response => {
        if (callback) {
          callback();
        }
        return waitForTaskToComplete(response.entity.id);
      })
      .then(() => store.dispatch('manageContent/refreshChannelList', null, { root: true }));
  }

  if (store.getters.inPeerImportMode) {
    return TaskResource.startRemoteContentImport({
      ...params,
      baseurl: selectedPeer.base_url,
    })
      .then(response => {
        if (callback) {
          callback();
        }
        return waitForTaskToComplete(response.entity.id);
      })
      .then(() => store.dispatch('manageContent/refreshChannelList', null, { root: true }));
  }

  if (store.getters.inLocalImportMode) {
    return TaskResource.startDiskContentImport({
      ...params,
      drive_id: selectedDrive.id,
    })
      .then(response => {
        if (callback) {
          callback();
        }
        return waitForTaskToComplete(response.entity.id);
      })
      .then(() => store.dispatch('manageContent/refreshChannelList', null, { root: true }));
  }

  return TaskResource.startDiskContentExport({
    ...params,
    drive_id: selectedDrive.id,
  }).then(() => {
    if (callback) {
      callback();
    }
  });
}
