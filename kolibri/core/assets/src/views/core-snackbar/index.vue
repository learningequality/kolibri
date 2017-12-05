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
        ref="snackbar"
        class="snackbar"
        :message="text"
        :action="actionText"
        @action-click="$emit('actionClicked')"
        tabindex="0"
      />
    </transition>
  </div>

</template>


<script>

  import uiSnackbar from 'keen-ui/src/UiSnackbar';
  import { clearSnackbar } from 'kolibri.coreVue.vuex.actions';

  /* Snackbars are used to display notification. */
  export default {
    name: 'coreSnackbar',
    components: {
      uiSnackbar,
    },
    props: {
      /* Text of notification to be displayed */
      text: {
        type: String,
        required: true,
      },
      /* To provide an action button, provide text */
      actionText: {
        type: String,
        required: false,
      },
      /* Automatically dismiss the snackbar */
      autoDismiss: {
        type: Boolean,
        default: false,
      },
      /* Duration that the snackbar is visible before it is automatically dismissed */
      duration: {
        type: Number,
        default: 4000,
      },
      /* Show a backdrop to prevent interaction with the page */
      backdrop: {
        type: Boolean,
        default: false,
      },
    },
    data: () => ({
      timeout: null,
      isVisible: false,
      previouslyFocusedElement: null,
    }),
    mounted() {
      this.isVisible = true;
      if (this.autoDismiss) {
        this.timeout = window.setTimeout(this.clearSnackbar, this.duration);
      }
      if (this.backdrop) {
        window.addEventListener('focus', this.containFocus, true);
        this.previouslyFocusedElement = document.activeElement;
        this.previouslyFocusedElement.blur();
      }
    },
    beforeDestroy() {
      this.isVisible = false;
      if (this.timeout) {
        window.clearTimeout(this.timeout);
      }
      if (this.backdrop) {
        window.removeEventListener('focus', this.containFocus, true);
        this.previouslyFocusedElement.focus();
      }
    },
    methods: {
      containFocus(event) {
        if (event.target === window) {
          return;
        }
        if (!this.$refs.snackbar.$el.contains(event.target)) {
          this.$refs.snackbar.$el.focus();
        }
      },
    },
    vuex: {
      actions: {
        clearSnackbar,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .snackbar
    position: fixed
    bottom: 0
    left: 0
    z-index: 24
    margin: 16px

    >>>.ui-snackbar__action-button
      color: $core-bg-light
      font-weight: bold

  .snackbar-backdrop
    z-index: 16
    position: fixed
    top: 0
    bottom: 0
    right: 0
    left: 0
    background-color: rgba(0, 0, 0, 0.7)

  .snackbar-enter-active, .snackbar-leave-active
    transition-property: transform, opacity
    transition-duration: 0.4s
    transition-timing-function: ease

  .snackbar-enter, .snackbar-leave-to
    opacity: 0
    transform: translateY(100px)

</style>
