// Mixin that can be used for a component to view and manage
// the task queue
import { FacilityTaskResource } from 'kolibri.resources';
import { TaskTypes } from '../../constants';

function isSyncTask(task) {
  return task.type === TaskTypes.SYNCDATAPORTAL || task.type === TaskTypes.SYNCPEERFULL;
}

function taskFacilityMatch(task, facility) {
  return task.facility === facility.id;
}

function retryKdpSync(task) {
  return FacilityTaskResource.cleartask(task.id).then(() => {
    return FacilityTaskResource.dataportalsync({
      id: task.facility,
      name: task.facility_name,
    });
  });
}

function retryPeerSync(task) {
  const retryData = {
    facility: task.facility,
    facility_name: task.facility_name,
    device_name: task.device_name,
    device_id: task.device_id,
    baseurl: task.baseurl,
  };
  return FacilityTaskResource.cleartask(task.id).then(() => {
    return FacilityTaskResource.startpeerfacilitysync(retryData);
  });
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
      } else if (action === 'retry') {
        if (task.type === TaskTypes.SYNCDATAPORTAL) {
          return retryKdpSync(task);
        } else if (task.type === TaskTypes.SYNCPEERFULL) {
          return retryPeerSync(task);
        } else {
          return Promise.resolve();
        }
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
