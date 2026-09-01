import { Resource } from 'kolibri/apiResource';

export default new Resource({
  name: 'task',

  startTask(task, multipart = false) {
    return this.create(task, multipart);
  },

  startTasks(tasks, multipart = false) {
    return this.bulkCreate(tasks, multipart);
  },

  async cancel(jobId) {
    const response = await this.request({ method: 'POST', action: 'cancel', routeParams: jobId });
    return response.data;
  },

  async clear(jobId) {
    const response = await this.request({ method: 'POST', action: 'clear', routeParams: jobId });
    return response.data;
  },

  async restart(jobId) {
    const response = await this.request({ method: 'POST', action: 'restart', routeParams: jobId });
    return response.data;
  },

  // `clearall` reads the queue from the request body, unlike the sibling `list` action which
  // reads it from the query string - sending it as a param would clear every queue.
  async clearAll(queue) {
    const response = await this.request({
      method: 'POST',
      action: 'clearall',
      data: queue ? { queue } : undefined,
    });
    return response.data;
  },
});
