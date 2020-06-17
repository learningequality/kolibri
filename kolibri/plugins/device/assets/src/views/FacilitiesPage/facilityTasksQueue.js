// Mixin that can be used for a component to view and manage
// the task queue
import { FacilityTaskResource } from 'kolibri.resources';
import { taskIsClearable } from '../../constants';

const TaskTypes = Object.freeze({
  SYCNDATAPORTAL: 'SYNCDATAPORTAL',
  // TODO rename
  SYNCPEERFULL: 'SYNCPEER/FULL',
  SYNCPEERPULL: 'SYNCPEER/PULL',
  DELETEFACILITY: 'DELETEFACILITY',
});

function isSyncTask(task) {
  return task.type === TaskTypes.SYNCDATAPORTAL || task.type === TaskTypes.SYNCPEERFULL;
}

function taskFacilityMatch(task, facility) {
  return task.facility === facility.id;
}

function fetchTasks() {
  return FacilityTaskResource.fetchCollection({ force: true });
}

export default {
  data() {
    return {
      facilityTasks: [],
      isPolling: true,
    };
  },
  methods: {
    pollFacilityTasks() {
      fetchTasks().then(tasks => {
        this.facilityTasks = tasks;
        if (this.isPolling) {
          setTimeout(() => {
            return this.pollFacilityTasks();
          }, 2000);
        }
      });
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
        return Boolean(
          this.facilityTasks.find(
            task =>
              isSyncTask(task) && taskFacilityMatch(task, facility) && !taskIsClearable(task.status)
          )
        );
      };
    },
    facilityIsDeleting() {
      return function isDeleting(facility) {
        return Boolean(
          this.facilityTasks.find(
            task =>
              task.type === TaskTypes.DELETEFACILITY &&
              taskFacilityMatch(task, facility) &&
              !taskIsClearable(task.status)
          )
        );
      };
    },
  },
};
