<template>

  <div v-show="$mediaType !== 'print'" class="report-controls">
    <slot></slot>
    <div class="report-controls-buttons">
      <UiIconButton
        type="flat"
        :title="coachString('printReportAction')"
        @click.prevent="$print()"
      >
        <mat-svg name="print" category="action" />
      </UiIconButton>
    </div>
  </div>

</template>


<script>

  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import commonCoach from '../common';

  export default {
    name: 'ReportsControls',
    components: { UiIconButton },
    mixins: [commonCoach],
  };

</script>


<style lang="scss" scoped>

  .report-controls {
    position: relative;
    min-height: 10px;
    padding-right: 80px;
  }

  .report-controls-buttons {
    position: absolute;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
  }

</style>
