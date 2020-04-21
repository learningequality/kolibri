<template>

  <TaskPanel
    :statusMsg="taskInfo.statusMsg"
    :headingMsg="taskInfo.headingMsg"
    :underHeadingMsg="underHeadingMsg"
    :underProgressMsg="underProgressMsg"
    :task="task"
    :loaderType="loaderType"
    :showCircularLoader="taskInfo.isRunning"
    :buttonSet="buttonSet"
  />

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { syncFacilityTaskDisplayInfo, removeFacilityTaskDisplayInfo } from '../syncTaskUtils';
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
        return this.task.type === 'SYNC_FACILITY';
      },
      isRemoveTask() {
        return this.task.type === 'REMOVE_FACILITY';
      },
      taskInfo() {
        if (this.isSyncTask) {
          return syncFacilityTaskDisplayInfo(this.task);
        } else if (this.isRemoveTask) {
          return removeFacilityTaskDisplayInfo(this.task);
        }
        return null;
      },
      loaderType() {
        return 'determinate';
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
