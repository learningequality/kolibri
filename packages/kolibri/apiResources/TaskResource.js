import { Resource } from 'kolibri/apiResource';

export default new Resource({
  name: 'task',

  startTask(task, multipart = false) {
    return this.create(task, multipart);
  },

  startTasks(tasks, multipart = false) {
    return this.bulkCreate(tasks, multipart);
  },

  cancel(jobId) {
    return this.postDetailEndpoint('cancel', jobId);
  },

  async cancel_v2(jobId) {
    const response = await this.request({ method: 'POST', action: 'cancel', routeParams: jobId });
    return response.data;
  },

  clear(jobId) {
    return this.postDetailEndpoint('clear', jobId);
  },

  async clear_v2(jobId) {
    const response = await this.request({ method: 'POST', action: 'clear', routeParams: jobId });
    return response.data;
  },

  restart(jobId) {
    return this.postDetailEndpoint('restart', jobId);
  },

  async restart_v2(jobId) {
    const response = await this.request({ method: 'POST', action: 'restart', routeParams: jobId });
    return response.data;
  },

  clearAll(queue) {
    const params = {};
    if (queue) {
      params.queue = queue;
    }
    return this.postListEndpoint('clearall', params);
  },

  // `clearall` reads the queue from the request body, unlike the sibling `list` action which
  // reads it from the query string - sending it as a param would clear every queue.
  async clearAll_v2(queue) {
    const response = await this.request({
      method: 'POST',
      action: 'clearall',
      data: queue ? { queue } : undefined,
    });
    return response.data;
  },
});
