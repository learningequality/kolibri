<template>

  <div v-show="$mediaType !== 'print'" class="report-controls">
    <slot></slot>
    <ReportsControlButtons />
  </div>

</template>


<script>

  import ReportsControlButtons from './ReportsControlButtons';

  export default {
    name: 'ReportsControls',
    components: { ReportsControlButtons },
  };

</script>


<style lang="scss" scoped>

  .report-controls {
    position: relative;
    min-height: 10px;
    padding-right: 80px;
  }

  /deep/ .report-controls-buttons {
    position: absolute;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
  }

</style>
