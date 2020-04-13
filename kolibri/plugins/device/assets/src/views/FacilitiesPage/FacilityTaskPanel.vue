<template>

  <div>
    <p>{{ taskStatus }}</p>
    <p>{{ syncDataTransferMessage }}</p>
    <p>{{ taskLabel }}</p>
    <p>{{ task.device_hostname }}</p>
    <p>{{ startedByText }}</p>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import taskStrings from '../taskStrings';

  const TaskStatuses = {
    PENDING: 'PENDING',
    COMPLETED: 'COMPLETED',
    CANCELED: 'CANCELED',
    FAILED: 'FAILED',
  };

  const SyncTaskStatuses = {
    SESSION_CREATION: 'SESSION_CREATION',
    REMOTE_QUEUING: 'REMOTE_QUEUING',
    PULLING: 'PULLING',
    LOCAL_DEQUEUING: 'LOCAL_DEQUEUING',
    LOCAL_QUEUING: 'LOCAL_QUEUING',
    PUSHING: 'PUSHING',
    REMOTE_DEQUEUING: 'REMOTE_DEQUEUING',
    REMOVING_FACILITY: 'REMOVING_FACILITY',
  };

  function taskString(...args) {
    return taskStrings.$tr(...args);
  }

  function getTaskStatus(task) {
    return {
      [TaskStatuses.PENDING]: taskString('taskWaitingStatus'),
      [TaskStatuses.COMPLETED]: taskString('taskFinishedStatus'),
      [TaskStatuses.CANCELED]: taskString('taskCanceledStatus'),
      [TaskStatuses.CANCELED]: taskString('taskCancelingStatus'),
      [TaskStatuses.FAILED]: taskString('taskFailedStatus'),
    }[task.status];
  }

  function getSyncTaskDescription(task) {
    return {
      [SyncTaskStatuses.SESSION_CREATION]: taskString('establishingConnectionStatus'),
      [SyncTaskStatuses.REMOTE_QUEUING]: taskString('remotelyPreparingDataStatus'),
      [SyncTaskStatuses.PULLING]: taskString('receivingDataStatus'),
      [SyncTaskStatuses.LOCAL_DEQUEUING]: taskString('locallyIntegratingDataStatus'),
      [SyncTaskStatuses.LOCAL_QUEUING]: taskString('locallyPreparingDataStatus'),
      [SyncTaskStatuses.PUSHING]: taskString('sendingDataStatus'),
      [SyncTaskStatuses.REMOTE_DEQUEUING]: taskString('remotelyIntegratingDataStatus'),
    }[task.status];
  }

  const TOTAL_SYNC_STEPS = 7;

  export default {
    name: 'FacilityTaskPanel',
    components: {},
    mixins: [commonCoreStrings],
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
        return this.task.type === 'SYNC_FACILITY';
      },
      isRemoveTask() {
        return this.task.type === 'REMOVE_FACILITY';
      },
      startedByText() {
        return taskString('taskStartedByLabel', { username: this.task.started_by });
      },
      syncTaskStepNumber() {
        if (!this.isSyncTask) {
          return null;
        }
        return {
          [SyncTaskStatuses.SESSION_CREATION]: 1,
          [SyncTaskStatuses.REMOTE_QUEUING]: 2,
          [SyncTaskStatuses.PULLING]: 3,
          [SyncTaskStatuses.LOCAL_DEQUEUING]: 4,
          [SyncTaskStatuses.LOCAL_QUEUING]: 5,
          [SyncTaskStatuses.PUSHING]: 6,
          [SyncTaskStatuses.REMOTE_DEQUEUING]: 7,
        }[this.task.status];
      },
      taskLabel() {
        const facilityName = this.coreString('nameWithIdInParens', {
          name: this.task.facility_name,
          id: this.task.facility_id.slice(0, 4),
        });
        if (this.isSyncTask) {
          return facilityName;
        } else if (this.isRemoveTask) {
          return taskString('removeFacilityTaskLabel', { facilityName });
        } else {
          return '';
        }
      },
      taskStatus() {
        // Test for general Task statuses
        const generalTaskStatus = getTaskStatus(this.task);

        if (generalTaskStatus) {
          return generalTaskStatus;
        }

        // Test for Remove-specific statuses
        if (this.isRemoveTask && this.task.status === SyncTaskStatuses.REMOVING_FACILITY) {
          return taskString('removingFacilityStatus');
        }

        // Test for Sync-specific statuses
        const syncTaskDescription = getSyncTaskDescription(this.task);

        if (this.isSyncTask && syncTaskDescription) {
          return this.$tr('stepAndDescription', {
            description: syncTaskDescription,
            step: this.syncTaskStepNumber,
            total: TOTAL_SYNC_STEPS,
          });
        }

        return taskString('unknown');
      },
      syncDataTransferMessage() {
        // Magic number: 3+ indicates sync task is starting to push/pull data
        if (this.isSyncTask && this.syncTaskStepNumber >= 3) {
          return this.$tr('bytesSentAndReceived', {
            bytesSent: this.task.bytes_sent,
            bytesReceived: this.task.bytes_received,
          });
        } else {
          return '';
        }
      },
    },
    methods: {},
    $trs: {
      stepAndDescription: {
        message: '{step, number} of {total, number} - {description}',
        context: 'Template for message of the form "Step 1 of 7 - Establishing connection"',
      },
      bytesSentAndReceived: {
        message: `{bytesSent} sent • {bytesReceived} received`,
        context: 'Amounts of data transferred in sync task',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
