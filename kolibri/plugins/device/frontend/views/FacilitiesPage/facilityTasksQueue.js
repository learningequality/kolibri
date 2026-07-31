import TaskResource from 'kolibri/apiResources/TaskResource';
import { TaskStatuses, TaskTypes } from 'kolibri-common/utils/syncTaskUtils';

function isSyncTask(task) {
  return task.type === TaskTypes.SYNCDATAPORTAL || task.type === TaskTypes.SYNCPEERFULL;
}

function taskFacilityMatch(task, facility) {
  return task.facility_id === facility.id;
}

function isActiveTask(task) {
  // A schedule that has never run is not a task the user is watching — it
  // belongs on Manage sync schedule.
  return (
    task.repeat !== null ||
    task.status === TaskStatuses.RUNNING ||
    Boolean(task.last_finished_datetime)
  );
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
    activeFacilityTasks() {
      return this.facilityTasks.filter(isActiveTask);
    },
    facilityIsSyncing() {
      return facility =>
        this.facilityTasks.some(
          task =>
            isSyncTask(task) &&
            task.status === TaskStatuses.RUNNING &&
            taskFacilityMatch(task, facility),
        );
    },
    facilityIsDeleting() {
      return function isDeleting(facility) {
        return Boolean(
          this.facilityTasks.find(
            task =>
              task.type === TaskTypes.DELETEFACILITY &&
              taskFacilityMatch(task, facility) &&
              !task.clearable,
          ),
        );
      };
    },
  },
};
