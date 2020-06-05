<template>

  <div v-show="!$isPrint" class="report-controls">
    <slot></slot>
    <div class="report-controls-buttons">

      <KIconButton
        ref="printButton"
        icon="print"
        :aria-label="coachString('printReportAction')"
        @click.prevent="$print()"
      />
      <KTooltip
        reference="printButton"
        :refs="$refs"
      >
        {{ coachString('printReportAction') }}
      </KTooltip>

      <KIconButton
        v-if="!exportDisabled"
        ref="exportButton"
        icon="get_app"
        :aria-label="coachString('exportCSVAction')"
        @click.prevent="$emit('export')"
      />
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

  import { isEmbeddedWebView } from 'kolibri.utils.browserInfo';
  import commonCoach from '../common';

  export default {
    name: 'ReportsControls',
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
        return isEmbeddedWebView || this.disableExport;
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
