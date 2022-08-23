// Mixin that can be used for a component to view and manage
// the task queue
import { TaskResource } from 'kolibri.resources';
import { TaskTypes } from 'kolibri.utils.syncTaskUtils';

function isSyncTask(task) {
  return task.type === TaskTypes.SYNCDATAPORTAL || task.type === TaskTypes.SYNCPEERFULL;
}

function taskFacilityMatch(task, facility) {
  return task.facility === facility.id;
}

export default {
  data() {
    return {
      facilityTasks: [],
      isPolling: true,
    };
  },
  methods: {
    isSyncTask,
    pollFacilityTasks() {
      TaskResource.list({ queue: 'facility_task' }).then(tasks => {
        this.facilityTasks = tasks;
        if (this.isPolling) {
          setTimeout(() => {
            return this.pollFacilityTasks();
          }, 2000);
        }
      });
    },
    manageFacilityTask(action, task) {
      if (action === 'cancel') {
        return TaskResource.cancel(task.id);
      } else if (action === 'clear') {
        return TaskResource.clear(task.id);
      } else if (action === 'retry') {
        return TaskResource.restart(task.id);
      } else {
        return Promise.resolve();
      }
    },
    clearCompletedFacilityTasks() {
      return TaskResource.clearAll('facility_task');
    },
  },
  beforeMount() {
    this.pollFacilityTasks();
  },
  beforeDestroy() {
    this.isPolling = false;
  },
  computed: {
    facilityIsSyncing() {
      return function isSyncing(facility) {
        const syncTasks = this.facilityTasks.filter(t => isSyncTask(t) && !t.clearable);
        return Boolean(syncTasks.find(task => taskFacilityMatch(task, facility)));
      };
    },
    facilityIsDeleting() {
      return function isDeleting(facility) {
        return Boolean(
          this.facilityTasks.find(
            task =>
              task.type === TaskTypes.DELETEFACILITY &&
              taskFacilityMatch(task, facility) &&
              !task.clearable
          )
        );
      };
    },
  },
};
