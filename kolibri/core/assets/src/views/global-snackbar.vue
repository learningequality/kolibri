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
  import { mapGetters } from 'vuex';

  export default {
    name: 'globalSnackbar',
    components: {
      coreSnackbar,
    },
    computed: {
      ...mapGetters(['snackbarIsVisible', 'snackbarOptions']),
      key() {
        const options = Object.assign({}, this.snackbarOptions);
        // The forceReuse option is used to force the reuse of the snackbar
        // This is helpful when we want to just update the text but not re-run the transition
        // This is used in the disconnected snackbar
        if (options.forceReuse) {
          options.text = '';
          return JSON.stringify(options);
        }
        return JSON.stringify(options) + new Date();
      },
    },
    methods: {
      hideCallback() {
        if (this.snackbarOptions.hideCallback) {
          this.snackbarOptions.hideCallback();
        }
      },
    },
  };

</script>


<style lang="scss" scoped></style>
