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

  import kLinearLoader from 'kolibri.coreVue.components.kLinearLoader';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import errorBox from './error-box';

  export default {
    name: 'appBody',
    components: {
      errorBox,
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
    vuex: {
      getters: {
        loading: state => state.core.loading,
        blockDoubleClicks: state => state.core.blockDoubleClicks,
        error: state => state.core.error,
        documentTitle: state => state.core.title,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .app-body
    left: 0
    right: 0
    position: absolute
    overflow-x: hidden

  .wrapper
    max-width: 1000px
    margin: auto

  .toolbar-loader
    position: fixed
    right: 0
    left: 0

  .click-mask
    position: fixed
    top: 0
    left: 0
    width: 100%
    height: 100%
    z-index: 24

</style>
