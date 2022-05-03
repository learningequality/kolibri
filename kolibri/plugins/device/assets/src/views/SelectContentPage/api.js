import { TaskResource } from 'kolibri.resources';
import { TaskTypes } from '../../constants';

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
    taskParams.task = TaskTypes.REMOTECONTENTIMPORT;
  } else if (importSource.type === 'drive') {
    taskParams.drive_id = importSource.driveId;
    taskParams.task = TaskTypes.DISKCONTENTIMPORT;
  } else {
    return Promise.reject();
  }
  return TaskResource.startTask(taskParams);
}
