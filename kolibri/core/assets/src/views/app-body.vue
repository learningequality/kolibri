<template>

  <!-- class unused, used as identifier when debugging from DOM -->
  <div class="app-body" :style="contentStyle">
    <k-indeterminate-linear-indicator
      v-if="loading"
      class="toolbar-loading-indicator"
      :style="{ top: padding === 32 ? '64px' : '56px' }"
      :delay="false"
    />
    <template v-else>
      <error-box v-if="error" />
      <slot></slot>
    </template>
  </div>

</template>


<script>

  import kIndeterminateLinearIndicator from 'kolibri.coreVue.components.kIndeterminateLinearIndicator';

  import errorBox from './error-box';

  export default {
    name: 'appBody',
    components: {
      errorBox,
      kIndeterminateLinearIndicator,
    },
    props: {
      padding: {
        type: Number,
        required: true,
      },
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

  .toolbar-loading-indicator
    position: fixed
    right: 0
    left: 0

</style>
