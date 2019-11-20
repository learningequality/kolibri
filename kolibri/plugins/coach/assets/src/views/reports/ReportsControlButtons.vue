<template>

  <div class="report-controls-buttons">
    <UiIconButton
      type="flat"
      :title="coachString('printReportAction')"
      @click.prevent="$print()"
    >
      <mat-svg name="print" category="action" />
    </UiIconButton>
  </div>

</template>


<script>

  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import commonCoach from '../common';

  export default {
    name: 'ReportsControlButtons',
    components: { UiIconButton },
    mixins: [commonCoach],
  };

</script>


<style lang="scss" scoped></style>
