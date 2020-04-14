<template>

  <div>
    <p>{{ taskInfo.statusMsg }}</p>
    <p>{{ taskinfo.bytesTransferredMsg }}</p>
    <p>{{ taskInfo.title }}</p>
    <p>{{ taskInfo.deviceNameMsg }}</p>
    <p>{{ taskInfo.startedByMsg }}</p>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { syncTaskDisplayInfo, removeFacilityTaskDisplayInfo } from '../syncTaskUtils';

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
      taskInfo() {
        if (this.isSyncTask) {
          return syncTaskDisplayInfo(this.task);
        } else if (this.isRemoveTask) {
          return removeFacilityTaskDisplayInfo(this.task);
        }
        return null;
      },
    },
    methods: {},
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
