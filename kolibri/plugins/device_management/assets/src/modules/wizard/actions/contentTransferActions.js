import { TaskResource } from 'kolibri.resources';

/**
 * Starts a Task that transfers Channel ContentNodes to/from a drive
 *
 */
export function transferChannelContent(store) {
  const combineIds = nodes => nodes.map(({ id }) => id);
  const { transferredChannel, selectedDrive, nodesForTransfer, selectedPeer } = store.state;
  const params = {
    channel_id: transferredChannel.id,
    node_ids: combineIds(nodesForTransfer.included),
    exclude_node_ids: combineIds(nodesForTransfer.omitted),
  };

  if (store.getters.inRemoteImportMode) {
    return TaskResource.startRemoteContentImport(params);
  }

  if (store.getters.inPeerImportMode) {
    return TaskResource.startRemoteContentImport({
      ...params,
      baseurl: selectedPeer.base_url,
    });
  }

  if (store.getters.inLocalImportMode) {
    return TaskResource.startDiskContentImport({
      ...params,
      drive_id: selectedDrive.id,
    });
  }

  return TaskResource.startDiskContentExport({
    ...params,
    drive_id: selectedDrive.id,
  });
}
