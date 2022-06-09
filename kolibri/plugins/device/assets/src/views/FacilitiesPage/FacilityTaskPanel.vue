<template>

  <FacilityTaskPanelDetails
    :statusMsg="statusMsg"
    :headingMsg="headingMsg"
    :underHeadingMsg="underHeadingMsg"
    :underProgressMsg="underProgressMsg"
    :task="task"
    :loaderType="loaderType"
    :showCircularLoader="isRunning"
    :buttonSet="buttonSet"
    @cancel="$emit('click', 'cancel')"
    @clear="$emit('click', 'clear')"
    @retry="$emit('click', 'retry')"
  />

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonTaskStrings from 'kolibri.coreVue.mixins.commonTaskStrings';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';

  import { SyncTaskStatuses, TaskStatuses, TaskTypes } from '../../constants';
  import FacilityTaskPanelDetails from './FacilityTaskPanelDetails';

  const PUSH_PULL_STEPS = 7;
  const PULL_STEPS = 4;

  const indeterminateSyncStatuses = [
    SyncTaskStatuses.SESSION_CREATION,
    SyncTaskStatuses.LOCAL_QUEUING,
    SyncTaskStatuses.LOCAL_DEQUEUING,
    SyncTaskStatuses.REMOTE_QUEUING,
    SyncTaskStatuses.REMOTE_DEQUEUING,
    SyncTaskStatuses.PENDING,
  ];

  const syncStatusToStepMap = {
    [SyncTaskStatuses.SESSION_CREATION]: 1,
    [SyncTaskStatuses.REMOTE_QUEUING]: 2,
    [SyncTaskStatuses.PULLING]: 3,
    [SyncTaskStatuses.LOCAL_DEQUEUING]: 4,
    [SyncTaskStatuses.LOCAL_QUEUING]: 5,
    [SyncTaskStatuses.PUSHING]: 6,
    [SyncTaskStatuses.REMOTE_DEQUEUING]: 7,
  };

  const taskStatusToMessageMap = {
    [TaskStatuses.PENDING]: 'taskWaitingStatus',
    [TaskStatuses.QUEUED]: 'taskWaitingStatus',
    [TaskStatuses.COMPLETED]: 'taskFinishedStatus',
    [TaskStatuses.CANCELED]: 'taskCanceledStatus',
    [TaskStatuses.CANCELING]: 'taskCancelingStatus',
    [TaskStatuses.FAILED]: 'taskFailedStatus',
  };

  const syncStatusToMessageMap = {
    ...taskStatusToMessageMap,
    [SyncTaskStatuses.SESSION_CREATION]: 'establishingConnectionStatus',
    [SyncTaskStatuses.REMOTE_QUEUING]: 'remotelyPreparingDataStatus',
    [SyncTaskStatuses.PULLING]: 'receivingDataStatus',
    [SyncTaskStatuses.LOCAL_DEQUEUING]: 'locallyIntegratingDataStatus',
    [SyncTaskStatuses.LOCAL_QUEUING]: 'locallyPreparingDataStatus',
    [SyncTaskStatuses.PUSHING]: 'sendingDataStatus',
    [SyncTaskStatuses.REMOTE_DEQUEUING]: 'remotelyIntegratingDataStatus',
  };

  export default {
    name: 'FacilityTaskPanel',
    components: {
      FacilityTaskPanelDetails,
    },
    mixins: [commonCoreStrings, commonTaskStrings],
    props: {
      task: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {};
    },
    computed: {
      isSyncTask() {
        return (
          this.task.type === TaskTypes.SYNCDATAPORTAL || this.task.type === TaskTypes.SYNCPEERFULL
        );
      },
      isDeleteTask() {
        return this.task.type === TaskTypes.DELETEFACILITY;
      },
      isSetupImportTask() {
        // HACK infer that we're in the setup wizard because the started_by field is null
        return !this.task.extra_metadata.started_by && this.task.type === TaskTypes.SYNCPEERPULL;
      },
      isImportTask() {
        return this.task.type === TaskTypes.SYNCPEERPULL;
      },
      isRunning() {
        return this.task.status === TaskStatuses.RUNNING;
      },
      isCompleted() {
        return this.task.status === TaskStatuses.COMPLETED;
      },
      isFailed() {
        return this.task.status === TaskStatuses.FAILED;
      },
      canCancel() {
        if (this.isSetupImportTask) {
          return false;
        }
        return !(this.isCompleted || this.isFailed) && this.task.cancellable;
      },
      canClear() {
        if (this.isSetupImportTask) {
          return false;
        }
        return this.task.clearable;
      },
      canRetry() {
        if (this.isSetupImportTask) {
          return false;
        }
        return this.isFailed;
      },
      loaderType() {
        const { sync_state = '' } = this.task;
        if (indeterminateSyncStatuses.find(s => s === sync_state)) {
          return 'indeterminate';
        }
        return 'determinate';
      },
      buttonSet() {
        if (this.canCancel) {
          return 'cancel';
        } else if (this.canClear) {
          return this.canRetry ? 'retry' : 'clear';
        }
        return '';
      },
      deviceName() {
        if (this.task.type === TaskTypes.SYNCDATAPORTAL) {
          return 'Kolibri Data Portal';
        }
        return this.formatNameWithId(
          this.task.extra_metadata.device_name,
          this.task.extra_metadata.device_id
        );
      },
      facilityName() {
        return this.formatNameWithId(this.task.extra_metadata.facility_name, this.task.facility_id);
      },
      headingMsg() {
        if (this.isSetupImportTask) {
          return '';
        }
        if (this.isImportTask) {
          return this.getTaskString('importFacilityTaskLabel', { facilityName: this.facilityName });
        }
        if (this.isSyncTask) {
          return this.getTaskString('syncFacilityTaskLabel', { facilityName: this.facilityName });
        }
        if (this.isDeleteTask) {
          return this.getTaskString('removeFacilityTaskLabel', { facilityName: this.facilityName });
        }
        return '';
      },
      underHeadingMsg() {
        if (this.isSetupImportTask) {
          if (this.isCompleted) {
            return this.getTaskString('importSuccessStatus', {
              facilityName: this.task.extra_metadata.facility_name,
            });
          } else if (this.isFailed) {
            return this.getTaskString('importFailedStatus', {
              facilityName: this.task.extra_metadata.facility_name,
            });
          } else {
            return '';
          }
        } else if (this.isSyncTask) {
          return this.deviceName;
        }
        return '';
      },
      statusMsg() {
        let statusMsg = this.getTaskString(
          taskStatusToMessageMap[this.task.status] || 'taskUnknownStatus'
        );
        if (this.isSyncTask) {
          if (!this.isCompleted) {
            const syncStageMsgKey = syncStatusToMessageMap[this.task.extra_metadata.sync_state];
            if (syncStageMsgKey) {
              statusMsg = this.getTaskString(syncStageMsgKey);
            }
          }
          if (this.isFailed) {
            statusMsg = `${statusMsg}: ${this.task.exception}`;
          } else if (!this.isCompleted) {
            const syncStep = syncStatusToStepMap[this.task.extra_metadata.sync_state];
            if (syncStep) {
              statusMsg = this.getTaskString('syncStepAndDescription', {
                step: syncStep,
                total: this.isImportTask ? PULL_STEPS : PUSH_PULL_STEPS,
                description: statusMsg,
              });
            }
          }
        } else if (this.isDeleteTask) {
          statusMsg = this.getTaskString('removingFacilityStatus');
        }

        return statusMsg;
      },
      underProgressMsg() {
        if (this.isSyncTask && this.isCompleted) {
          return this.getTaskString('syncBytesSentAndReceived', {
            bytesReceived: bytesForHumans(this.task.extra_metadata.bytes_received),
            bytesSent: bytesForHumans(this.task.extra_metadata.bytes_sent),
          });
        }
        return '';
      },
    },
    methods: {
      formatNameWithId(name, id) {
        return this.coreString('nameWithIdInParens', { name, id: id.slice(0, 4) });
      },
    },
  };

</script>


<style lang="scss" scoped></style>
