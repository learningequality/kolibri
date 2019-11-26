import { TaskResource } from 'kolibri.resources';

export function startImportTask(params) {
  const { importSource, channelId, included, excluded } = params;

  const taskParams = {
    channel_id: channelId,
    node_ids: included,
    exclude_node_ids: excluded,
  };

  if (importSource.type === 'peer' || importSource.type === 'studio') {
    if (importSource.id) {
      taskParams.peer_id = importSource.id;
    }
    return TaskResource.startRemoteContentImport(taskParams);
  } else if (importSource.type === 'drive') {
    taskParams.drive_id = importSource.driveId;
    return TaskResource.startDiskContentImport(taskParams);
  } else {
    return Promise.reject();
  }
}
