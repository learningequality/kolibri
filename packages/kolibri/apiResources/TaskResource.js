import { Resource } from 'kolibri/apiResource';

export default new Resource({
  name: 'task',

  startTask(task, multipart = false) {
    return this.create(task, multipart);
  },

  startTasks(tasks, multipart = false) {
    return this.create(tasks, multipart);
  },

  cancel(jobId) {
    return this.postDetailEndpoint('cancel', jobId);
  },

  clear(jobId) {
    return this.postDetailEndpoint('clear', jobId);
  },

  restart(jobId) {
    return this.postDetailEndpoint('restart', jobId);
  },

  clearAll(queue) {
    const params = {};
    if (queue) {
      params.queue = queue;
    }
    return this.postListEndpoint('clearall', params);
  },
});
