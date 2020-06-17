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
    @cancel="$emit('cancel')"
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
        return this.task.type === 'SYNCDATAPORTAL';
      },
      isRemoveTask() {
        return this.task.type === 'REMOVE_FACILITY';
      },
      isImportTask() {
        return this.task.type === 'SYNCPEER/PULL';
      },
      taskInfo() {
        if (this.isSyncTask) {
          return syncFacilityTaskDisplayInfo(this.task);
        } else if (this.isRemoveTask) {
          return removeFacilityTaskDisplayInfo(this.task);
        } else if (this.isImportTask) {
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
        if (this.taskInfo.canCancel) {
          return 'cancel';
        } else if (this.taskInfo.canClear) {
          return this.taskInfo.canRetry ? 'retry' : 'clear';
        } else {
          return '';
        }
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
