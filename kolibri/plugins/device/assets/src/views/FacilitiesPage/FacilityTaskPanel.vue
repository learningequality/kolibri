<template>

  <TaskPanel
    :statusMsg="taskInfo.statusMsg"
    :headingMsg="taskInfo.headingMsg"
    :task="taskInfo.taskData"
    :showCircularLoader="taskInfo.isRunning"
  >
    <template #underheading>
      <p v-if="taskInfo.deviceNameMsg">
        {{ taskInfo.deviceNameMsg }}
      </p>
      <p v-if="taskInfo.bytesTransferredMsg">
        {{ taskInfo.bytesTransferredMsg }}
      </p>
    </template>
  </TaskPanel>

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
    },
    methods: {
      taskIsRunningPred(task) {},
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
