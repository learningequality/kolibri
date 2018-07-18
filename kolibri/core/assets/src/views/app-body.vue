<template>

  <!-- class unused, used as identifier when debugging from DOM -->
  <div class="app-body" :style="contentStyle">
    <div v-if="blockDoubleClicks" class="click-mask"></div>
    <k-linear-loader
      v-if="loading"
      class="toolbar-loader"
      :style="{ top: isMobile ? '56px' : '64px' }"
      type="indeterminate"
      :delay="false"
    />

    <div
      v-else
      :style="bodyPadding"
      class="body-wrapper"
    >
      <app-error v-if="error" />

      <slot v-else>
      </slot>

    </div>
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import kLinearLoader from 'kolibri.coreVue.components.kLinearLoader';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import appError from './app-error';

  export default {
    name: 'appBody',
    components: {
      appError,
      kLinearLoader,
    },
    mixins: [responsiveWindow],
    props: {
      // reserve space at the top for appbar
      topGap: {
        type: Number,
        required: true,
        default: 0,
      },
      // reserve space at the bottom for floating widgets
      bottomGap: {
        type: Number,
        required: false,
        default: 0,
      },
    },
    computed: {
      ...mapState({
        loading: state => state.core.loading,
        blockDoubleClicks: state => state.core.blockDoubleClicks,
        error: state => state.core.error,
      }),
      isMobile() {
        return this.windowSize.breakpoint < 2;
      },
      contentStyle() {
        return {
          top: `${this.topGap}px`,
          bottom: `${this.bottomGap}px`,
        };
      },
      bodyPadding() {
        return {
          padding: `${this.isMobile ? 16 : 32}px`,
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  .app-body {
    position: absolute;
    right: 0;
    left: 0;
    overflow-x: hidden;
  }

  .body-wrapper {
    max-width: 1000px;
    margin: auto;
  }

  .toolbar-loader {
    position: fixed;
    right: 0;
    left: 0;
  }

  .click-mask {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 24;
    width: 100%;
    height: 100%;
  }

</style>
