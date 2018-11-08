<template>

  <div>
    <div
      v-if="backdrop"
      class="snackbar-backdrop"
    >
    </div>
    <transition name="snackbar">
      <UiSnackbar
        v-show="isVisible"
        ref="snackbar"
        class="snackbar"
        :message="text"
        :action="actionText"
        tabindex="0"
        @action-click="$emit('actionClicked')"
      />
    </transition>
  </div>

</template>


<script>

  import UiSnackbar from 'keen-ui/src/UiSnackbar';
  import { mapActions } from 'vuex';

  /* Snackbars are used to display notification. */
  export default {
    name: 'CoreSnackbar',
    components: {
      UiSnackbar,
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
        this.timeout = window.setTimeout(this.hideSnackbar, this.duration);
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
      ...mapActions(['clearSnackbar']),
      hideSnackbar() {
        this.$emit('hide');
        this.clearSnackbar();
      },
      containFocus(event) {
        if (event.target === window) {
          return;
        }
        if (!this.$refs.snackbar.$el.contains(event.target)) {
          this.$refs.snackbar.$el.focus();
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .snackbar {
    position: fixed;
    bottom: 0;
    left: 0;
    z-index: 24;
    margin: 16px;

    /deep/ .ui-snackbar__action-button {
      font-weight: bold;
      color: $core-bg-light;
    }

    /deep/ .ui-button--type-secondary:hover:not(.is-disabled) {
      background-color: rgba(255, 255, 255, 0.05);
    }
  }

  .snackbar-backdrop {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 16;
    background-color: rgba(0, 0, 0, 0.7);
  }

  .snackbar-enter-active,
  .snackbar-leave-active {
    transition-timing-function: ease;
    transition-duration: 0.4s;
    transition-property: transform, opacity;
  }

  .snackbar-enter,
  .snackbar-leave-to {
    opacity: 0;
    transform: translateY(100px);
  }

</style>
