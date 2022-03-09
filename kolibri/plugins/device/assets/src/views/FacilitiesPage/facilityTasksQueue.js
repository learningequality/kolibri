// Mixin that can be used for a component to view and manage
// the task queue
import { FacilityTaskResource } from 'kolibri.resources';
import { TaskTypes } from '../../constants';
import { isSyncTask } from '../syncTaskUtils';

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
      FacilityTaskResource.fetchCollection({ force: true }).then(tasks => {
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
        return FacilityTaskResource.canceltask(task.id);
      } else if (action === 'clear') {
        return FacilityTaskResource.cleartask(task.id);
      } else if (action === 'retry' && isSyncTask(task)) {
        return FacilityTaskResource.retrySync(task.id).then(() => {
          // clear old task after we've initiated the retry, because the backend will pull
          // necessary information from the existing task for retrying
          return FacilityTaskResource.clearTask(task.id);
        });
      } else {
        return Promise.resolve();
      }
    },
    clearCompletedFacilityTasks() {
      return FacilityTaskResource.deleteFinishedTasks();
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
