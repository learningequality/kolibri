import { TaskResource } from 'kolibri.resources';
import { TaskTypes } from '../../constants';

export function startImportTask(params) {
  const { importSource, channelId, channelName, included, excluded } = params;

  const taskParams = {
    channel_id: channelId,
    channel_name: channelName,
    node_ids: included,
    exclude_node_ids: excluded,
  };

  if (importSource.type === 'peer' || importSource.type === 'studio') {
    if (importSource.id) {
      taskParams.peer_id = importSource.id;
    }
    taskParams.type = TaskTypes.REMOTECONTENTIMPORT;
  } else if (importSource.type === 'drive') {
    taskParams.drive_id = importSource.driveId;
    taskParams.type = TaskTypes.DISKCONTENTIMPORT;
  } else {
    return Promise.reject();
  }
  return TaskResource.startTask(taskParams);
}
