<template>

  <TaskPanel
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
    syncFacilityTaskDisplayInfo,
    removeFacilityTaskDisplayInfo,
    importFacilityTaskDisplayInfo,
  } from '../syncTaskUtils';
  import TaskPanel from './TaskPanel';

  export default {
    name: 'FacilityTaskPanel',
    components: {
      TaskPanel,
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
        return this.task.type === 'SYNCDATAPORTAL' || this.task.type === 'SYNCPEER/FULL';
      },
      isDeleteTask() {
        return this.task.type === 'DELETEFACILITY';
      },
      isSetupImportTask() {
        // HACK infer that we're in the setup wizard because the started_by field is null
        return !this.task.started_by && this.task.type === 'SYNCPEER/PULL';
      },
      isImportTask() {
        return this.task.type === 'SYNCPEER/PULL';
      },
      taskInfo() {
        if (this.isSyncTask || this.isImportTask) {
          return syncFacilityTaskDisplayInfo(this.task);
        } else if (this.isDeleteTask) {
          return removeFacilityTaskDisplayInfo(this.task);
        } else if (this.isSetupImportTask) {
          return importFacilityTaskDisplayInfo(this.task);
        }
        return {};
      },
      loaderType() {
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
        // Delete
        if (this.isSyncTask) {
          return 'retry';
        }
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
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
