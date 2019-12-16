<template>

  <div v-show="!$isPrint" class="report-controls">
    <slot></slot>
    <div class="report-controls-buttons">

      <UiIconButton
        ref="printButton"
        type="flat"
        :aria-label="coachString('printReportAction')"
        @click.prevent="$print()"
      >
        <mat-svg name="print" category="action" />
      </UiIconButton>
      <KTooltip
        reference="printButton"
        :refs="$refs"
      >
        {{ coachString('printReportAction') }}
      </KTooltip>

      <UiIconButton
        v-if="!exportDisabled"
        ref="exportButton"
        type="flat"
        :aria-label="coachString('exportCSVAction')"
        @click.prevent="$emit('export')"
      >
        <mat-svg name="get_app" category="action" />
      </UiIconButton>
      <KTooltip
        reference="exportButton"
        :refs="$refs"
      >
        {{ coachString('exportCSVAction') }}
      </KTooltip>
    </div>
  </div>

</template>


<script>

  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import { isEmbeddedWebView } from 'kolibri.utils.browser';
  import commonCoach from '../common';

  export default {
    name: 'ReportsControls',
    components: { UiIconButton },
    mixins: [commonCoach],
    props: {
      disableExport: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      exportDisabled() {
        // Always disable in app mode until we add the ability to download files.
        return isEmbeddedWebView() || this.disableExport;
      },
    },
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
