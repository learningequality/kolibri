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
    <div v-else class="wrapper">
      <error-box v-if="error" />
      <slot></slot>
    </div>
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import KLinearLoader from 'kolibri.coreVue.components.KLinearLoader';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import errorBox from './ErrorBox';

  export default {
    name: 'AppBody',
    components: {
      errorBox,
      KLinearLoader,
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
      padding() {
        return this.isMobile ? 16 : 32;
      },
      contentStyle() {
        return {
          top: `${this.topGap}px`,
          bottom: `${this.bottomGap}px`,
          padding: `${this.padding}px`,
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

  .wrapper {
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
