<template>

  <core-snackbar
    v-if="snackbarIsVisible"
    :text="snackbarOptions.text"
    :key="key"
    :actionText="snackbarOptions.actionText"
    :backdrop="snackbarOptions.backdrop"
    :autoDismiss="snackbarOptions.autoDismiss"
    @actionClicked="snackbarOptions.actionCallback()"
    @hide="hideCallback"
  />

</template>


<script>

  import coreSnackbar from 'kolibri.coreVue.components.coreSnackbar';
  import { snackbarIsVisible, snackbarOptions } from 'kolibri.coreVue.vuex.getters';

  export default {
    name: 'globalSnackbar',
    components: {
      coreSnackbar,
    },
    computed: {
      key() {
        const unique = Object.assign({}, this.snackbarOptions);
        // The forceReuse option is used to force the reuse of the snackbar
        // This is helpful when we want to just update the text but not re-run the transition
        // This is used in the disconnected snackbar
        if (this.snackbarOptions.forceReuse) {
          unique.text = '';
        }
        return JSON.stringify(unique);
      },
    },
    methods: {
      hideCallback() {
        if (this.snackbarOptions.hideCallback) {
          this.snackbarOptions.hideCallback();
        }
      },
    },
    vuex: {
      getters: {
        snackbarIsVisible,
        snackbarOptions,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
