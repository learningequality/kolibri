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
    return this.postDetailEndpoint('cancel', jobId);
  },

  clear(jobId) {
    return this.postDetailEndpoint('clear', jobId);
  },

  clearAll() {
    return this.postListEndpoint('clearall');
  },
});
