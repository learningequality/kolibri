<template>

  <!-- class unused, used as identifier when debugging from DOM -->
  <div class="app-body" :style="contentStyle">
    <ui-progress-linear
      v-if="loading"
      class="loading-bar"
      :style="{ top: padding === 32 ? '64px' : '56px' }"
      :color="secondaryLoadingBar ? 'black' : 'primary'"
    />
    <template v-else>
      <error-box v-if="error" />
      <slot></slot>
    </template>
  </div>

</template>


<script>

  import uiProgressLinear from 'keen-ui/src/UiProgressLinear';
  import errorBox from './error-box';

  export default {
    name: 'appBody',
    components: {
      uiProgressLinear,
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
      secondaryLoadingBar: {
        type: Boolean,
        required: true,
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

  .loading-bar
    position: fixed
    right: 0
    left: 0

</style>
