<template>

  <CoreSnackbar
    v-if="snackbarIsVisible"
    :key="key"
    :text="snackbarOptions.text"
    :actionText="snackbarOptions.actionText"
    :backdrop="snackbarOptions.backdrop"
    :autoDismiss="snackbarOptions.autoDismiss"
    :duration="snackbarOptions.duration"
    :bottomPosition="snackbarOptions.bottomPosition"
    @actionClicked="snackbarOptions.actionCallback()"
    @hide="hideCallback"
  />

</template>


<script>

  import CoreSnackbar from 'kolibri.coreVue.components.CoreSnackbar';
  import { mapGetters } from 'vuex';

  export default {
    name: 'GlobalSnackbar',
    components: {
      CoreSnackbar,
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
