<template>

  <!-- class unused, used as identifier when debugging from DOM -->
  <div class="app-body" :style="contentStyle">
    <div v-if="blockDoubleClicks" class="click-mask"></div>
    <KLinearLoader
      v-if="loading"
      class="toolbar-loader"
      :style="loaderPositionStyles"
      type="indeterminate"
      :delay="false"
    />

    <div
      v-else
      :style="bodyStyle"
      class="body-wrapper"
    >
      <slot></slot>
    </div>
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import KLinearLoader from 'kolibri.coreVue.components.KLinearLoader';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';

  export default {
    name: 'AppBody',
    components: {
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
      // when true, don't add any margins or padding (regardless of gaps)
      fullScreen: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      ...mapState({
        loading: state => state.core.loading,
        blockDoubleClicks: state => state.core.blockDoubleClicks,
      }),
      isMobile() {
        return this.windowIsSmall;
      },
      contentStyle() {
        return {
          top: `${this.fullScreen ? 0 : this.topGap}px`,
          bottom: `${this.fullScreen ? 0 : this.bottomGap}px`,
        };
      },
      loaderPositionStyles() {
        return {
          top: `${this.fullScreen ? 0 : this.topGap}px`,
        };
      },
      bodyStyle() {
        if (this.fullScreen) {
          return {
            padding: '0px',
            height: '100%',
          };
        }
        return {
          maxWidth: '1000px',
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
