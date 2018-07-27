import { TaskResource } from 'kolibri.resources';

/**
 * Starts a Task that transfers Channel ContentNodes to/from a drive
 *
 */
export function transferChannelContent(store) {
  let promise;
  const combineIds = nodes => nodes.map(({ id }) => id);
  const { transferredChannel, selectedDrive, nodesForTransfer } = store.state;
  const params = {
    channel_id: transferredChannel.id,
    node_ids: combineIds(nodesForTransfer.included),
    exclude_node_ids: combineIds(nodesForTransfer.omitted),
  };

  if (store.getters.inRemoteImportMode) {
    promise = TaskResource.startRemoteContentImport(params);
  } else if (store.getters.inLocalImportMode) {
    promise = TaskResource.startDiskContentImport({
      ...params,
      drive_id: selectedDrive.id,
    });
  } else {
    promise = TaskResource.startDiskContentExport({
      ...params,
      drive_id: selectedDrive.id,
    });
  }
  return promise;
}
