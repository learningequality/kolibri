<template>

  <div>
    <div
      v-if="backdrop"
      class="snackbar-backdrop"
    >
    </div>
    <ui-snackbar
      class="snackbar"
      :message="text"
      :action="actionText"
      @actionClick="$emit('actionClicked')"
    />
  </div>

</template>


<script>

  import uiSnackbar from 'keen-ui/src/UiSnackbar';
  import { clearSnackbar } from 'kolibri.coreVue.vuex.actions';

  export default {
    name: 'coreSnackbar',
    components: {
      uiSnackbar,
    },
    props: {
      text: {
        type: String,
        required: true,
      },
      actionText: {
        type: String,
        required: false,
      },
      autoDismiss: {
        type: Boolean,
        default: false,
      },
      duration: {
        type: Number,
        default: 5000,
      },
      backdrop: {
        type: Boolean,
        default: false,
      },
    },
    data: () => ({
      timeout: null,
    }),
    mounted() {
      if (this.autoDismiss) {
        this.timeout = window.setTimeout(this.clearSnackbar, this.duration);
      }
    },
    beforeDestroy() {
      if (this.timeout) {
        window.clearTimeout(this.timeout);
      }
    },
    vuex: {
      action: {
        clearSnackbar,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .snackbar
    position: fixed
    bottom: 0
    z-index: 24
    margin: 16px

  .snackbar-backdrop
    z-index: 16
    position: fixed
    top: 0
    bottom: 0
    right: 0
    left: 0
    background-color: rgba(0, 0, 0, 0.7)

</style>
