<template>

  <div>
    <div
      v-if="backdrop"
      class="snackbar-backdrop"
    >
    </div>
    <transition name="snackbar">
      <ui-snackbar
        v-show="isVisible"
        class="snackbar"
        :message="text"
        :action="actionText"
        @action-click="$emit('actionClicked')"
      />
    </transition>
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
      isVisible: false,
    }),
    mounted() {
      this.isVisible = true;
      if (this.autoDismiss) {
        this.timeout = window.setTimeout(this.clearSnackbar, this.duration);
      }
    },
    beforeDestroy() {
      this.isVisible = false;
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
    transition: transform 0.4s ease

  .snackbar-backdrop
    z-index: 16
    position: fixed
    top: 0
    bottom: 0
    right: 0
    left: 0
    background-color: rgba(0, 0, 0, 0.7)

  .snackbar-enter,
  .snackbar-leave-active
    transform: translateY(100px)

</style>
