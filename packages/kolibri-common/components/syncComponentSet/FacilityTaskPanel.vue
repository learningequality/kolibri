<template>

  <FacilityTaskPanelDetails
    :statusMsg="taskInfo.statusMsg"
    :headingMsg="taskInfo.headingMsg"
    :underHeadingMsg="taskInfo.deviceNameMsg"
    :underProgressMsg="taskInfo.bytesTransferredMsg"
    :task="task"
    :loaderType="loaderType"
    :showCircularLoader="taskInfo.isRunning"
    :buttonSet="buttonSet"
    @cancel="$emit('cancel')"
    @clear="$emit('clear')"
    @retry="$emit('retry')"
  />

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import {
    SyncTaskStatuses,
    syncFacilityTaskDisplayInfo,
    removeFacilityTaskDisplayInfo,
    importFacilityTaskDisplayInfo,
    importLodTaskDisplayInfo,
    TaskTypes,
  } from 'kolibri-common/utils/syncTaskUtils';
  import FacilityTaskPanelDetails from './FacilityTaskPanelDetails';

  const indeterminateSyncStatuses = [
    SyncTaskStatuses.SESSION_CREATION,
    SyncTaskStatuses.LOCAL_QUEUING,
    SyncTaskStatuses.LOCAL_DEQUEUING,
    SyncTaskStatuses.REMOTE_QUEUING,
    SyncTaskStatuses.REMOTE_DEQUEUING,
    SyncTaskStatuses.PENDING,
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
        return !this.task.extra_metadata.started_by && this.task.type === TaskTypes.SYNCPEERPULL;
      },
      isLODImportTask() {
        return this.task.type === TaskTypes.IMPORTLODUSER;
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
        if (this.isLODImportTask) {
          return importLodTaskDisplayInfo(this.task);
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
      buttonSet() {
        if (this.taskInfo.canCancel) {
          return 'cancel';
        } else if (this.taskInfo.canClear) {
          return this.taskInfo.canRetry ? 'retry' : 'clear';
        } else {
          return '';
        }
      },
    },
  };

</script>


<style lang="scss" scoped></style>
