import { TaskResource } from 'kolibri.resources';
import client from 'kolibri.client';
import urls from 'kolibri.urls';

function genParams(store) {
  const combineIds = nodes => nodes.map(({ id }) => id);
  const { transferredChannel, nodesForTransfer } = store.state;
  return {
    channel_id: transferredChannel.id,
    node_ids: combineIds(nodesForTransfer.included),
    exclude_node_ids: combineIds(nodesForTransfer.omitted),
  };
}

/**
 * Starts a Task that transfers Channel ContentNodes to/from a drive
 *
 */
export function transferChannelContent(store) {
  const params = genParams(store);
  const { selectedDrive, selectedPeer } = store.state;

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

export function setVerifiedResources(store) {
  const params = genParams(store);
  params.for_export = store.getters.inExportMode;
  return client({ path: urls['kolibri:devicemanagementplugin:size_and_count'](), params }).then(
    response => {
      store.commit('SET_VERIFIED_CONTENT_METRICS', response.entity);
    }
  );
}
