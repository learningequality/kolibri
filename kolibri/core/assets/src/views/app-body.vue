<template>

  <!-- class unused, used as identifier when debugging from DOM -->
  <div class="app-body" :style="contentStyle">
    <loading-spinner v-if="loading" />
    <template v-else>
      <error-box v-if="error" />
      <slot></slot>
    </template>
  </div>

</template>


<script>

  import loadingSpinner from 'kolibri.coreVue.components.loadingSpinner';
  import errorBox from '../error-box';

  export default {
    name: 'appBody',
    components: {
      loadingSpinner,
      errorBox,
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

</style>
