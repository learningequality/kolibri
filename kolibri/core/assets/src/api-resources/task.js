import { Resource } from 'kolibri.lib.apiResource';

export default new Resource({
  name: 'task',

  startTask(task, multipart = false) {
    return this.create(task, multipart);
  },

  startTasks(tasks, multipart = false) {
    return this.create(tasks, multipart);
  },

  cancelTask(jobId) {
    return this.postListEndpoint('cancel', {
      task_id: taskId,
    });
  },

  clear(jobId) {
    return this.postListEndpoint('deletefinishedtasks');
  },

  clearAll() {
    return this.postListEndpoint('clearall');
  },
});
