<template>

  <div class="body" :style="contentStyle">
    <loading-spinner v-if="loading" class="align-to-parent" />
    <template v-else>
      <error-box v-if="error" />
      <slot></slot>
    </template>

    <global-snackbar />
  </div>

</template>


<script>

  import loadingSpinner from 'kolibri.coreVue.components.loadingSpinner';
  import errorBox from '../error-box';
  import globalSnackbar from '../global-snackbar';

  export default {
    components: {
      loadingSpinner,
      errorBox,
      globalSnackbar,
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
          left: 0,
          right: 0,
        };
      },
    },
    watch: {
      title: 'updateDocumentTitle',
    },
    created() {
      this.updateDocumentTitle();
    },
    methods: {
      // move this responsibility to state?
      updateDocumentTitle() {
        document.title = this.documentTitle
          ? this.$tr('kolibriTitleMessage', { title: this.documentTitle })
          : this.$tr('kolibriMessage');
      },
    },
    vuex: {
      getters: {
        loading: state => state.core.loading,
        error: state => state.core.error,
        documentTitle: state => state.core.title,
      },
      actions: {},
    },
    $trs: {
      kolibriMessage: 'Kolibri',
      kolibriTitleMessage: '{ title } - Kolibri',
    },
  };

</script>


<style lang="stylus" scoped>

  .body
    position: fixed
    overflow-x: hidden

</style>
