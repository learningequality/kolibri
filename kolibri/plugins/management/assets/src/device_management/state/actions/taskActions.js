import { TaskResource } from 'kolibri.resources';

export function fetchCurrentTasks() {
  return TaskResource.getCollection().fetch()
  .then(function onSuccess(tasks) {
    return tasks.map(task => ({
      id: task.id,
      type: task.type,
      status: task.status,
      metadata: task.metadata,
      percentage: task.percentage,
    }));
  })
  .catch(function onFailure(err) {
    console.error(err); // eslint-disable-line
  })
}
