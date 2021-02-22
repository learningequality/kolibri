<template>

  <FacilityTaskPanelDetails
    :statusMsg="statusMsg"
    :headingMsg="headingMsg"
    :underHeadingMsg="underHeadingMsg"
    :underProgressMsg="underProgressMsg"
    :task="task"
    :loaderType="loaderType"
    :showCircularLoader="taskInfo.isRunning"
    :buttonSet="buttonSet"
    @cancel="$emit('click', 'cancel')"
    @clear="$emit('click', 'clear')"
    @retry="$emit('click', 'retry')"
  />

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import {
    SyncTaskStatuses,
    syncFacilityTaskDisplayInfo,
    removeFacilityTaskDisplayInfo,
    importFacilityTaskDisplayInfo,
  } from '../syncTaskUtils';
  import { TaskTypes } from '../../constants';
  import FacilityTaskPanelDetails from './FacilityTaskPanelDetails';

  const indeterminateSyncStatuses = [
    SyncTaskStatuses.SESSION_CREATION,
    SyncTaskStatuses.LOCAL_QUEUING,
    SyncTaskStatuses.LOCAL_DEQUEUING,
    SyncTaskStatuses.REMOTE_QUEUING,
    SyncTaskStatuses.REMOTE_DEQUEUING,
  ];

  export default {
    name: 'FacilityTaskPanel',
    components: {
      FacilityTaskPanelDetails,
    },
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
        return (
          this.task.type === TaskTypes.SYNCDATAPORTAL || this.task.type === TaskTypes.SYNCPEERFULL
        );
      },
      isDeleteTask() {
        return this.task.type === TaskTypes.DELETEFACILITY;
      },
      isSetupImportTask() {
        // HACK infer that we're in the setup wizard because the started_by field is null
        return !this.task.started_by && this.task.type === TaskTypes.SYNCPEERPULL;
      },
      isImportTask() {
        return this.task.type === TaskTypes.SYNCPEERPULL;
      },
      taskInfo() {
        if (this.isSetupImportTask) {
          return importFacilityTaskDisplayInfo(this.task);
        }
        if (this.isSyncTask || this.isImportTask) {
          return syncFacilityTaskDisplayInfo(this.task);
        }
        if (this.isDeleteTask) {
          return removeFacilityTaskDisplayInfo(this.task);
        }
        return {};
      },
      loaderType() {
        const { sync_state = '' } = this.task;
        if (indeterminateSyncStatuses.find(s => s === sync_state)) {
          return 'indeterminate';
        }

        return 'determinate';
      },
      statusMsg() {
        return this.taskInfo.statusMsg;
      },
      headingMsg() {
        return this.taskInfo.headingMsg;
      },
      underHeadingMsg() {
        return this.taskInfo.deviceNameMsg;
      },
      underProgressMsg() {
        return this.taskInfo.bytesTransferredMsg;
      },
      buttonSet() {
        if (this.taskInfo.canCancel) {
          return 'cancel';
        } else if (this.taskInfo.canClear) {
          // Import tasks can't be retried since we don't save the username/password
          if (this.isImportTask) {
            return 'clear';
          } else {
            return this.taskInfo.canRetry ? 'retry' : 'clear';
          }
        } else {
          return '';
        }
      },
    },
  };

</script>


<style lang="scss" scoped></style>
