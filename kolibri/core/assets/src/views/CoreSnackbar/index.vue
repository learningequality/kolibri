<template>

  <div>
    <template v-if="backdrop">
      <Backdrop class="snackbar-backdrop" />
      <!-- Prevent focus from leaving the this container -->
      <div
        tabindex="0"
        @focus="trapFocus"
      ></div>
    </template>
    <transition
      name="snackbar"
      @leave-to="clearSnackbar"
      @enter="handleOnEnter"
    >
      <UiSnackbar
        v-show="isVisible"
        id="coresnackbar"
        ref="snackbar"
        class="snackbar"
        :message="text"
        :action="actionText"
        tabindex="0"
        :style="styles"
        @action-click="handleActionClick"
      >
        <template #inner-focus-trap>
          <div
            tabindex="0"
            @focus="trapFocus"
          ></div>
        </template>
      </UiSnackbar>
    </transition>
  </div>

</template>


<script>

  import UiSnackbar from 'kolibri-design-system/lib/keen/UiSnackbar.vue';
  import Backdrop from 'kolibri.coreVue.components.Backdrop';
  import useSnackbar from 'kolibri.coreVue.composables.useSnackbar';

  /* Snackbars are used to display notification. */
  export default {
    name: 'CoreSnackbar',
    components: {
      Backdrop,
      UiSnackbar,
    },
    setup() {
      const { clearSnackbar } = useSnackbar();
      return { clearSnackbar };
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
        default: null,
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
      /* Integer that over-rides the default 'bottom: 0' CSS */
      bottomPosition: {
        type: Number,
        default: null,
      },
    },
    data() {
      return {
        timeout: null,
        isVisible: false,
        previouslyFocusedElement: null,
      };
    },
    computed: {
      styles() {
        if (this.bottomPosition) {
          return {
            bottom: `${this.bottomPosition}px`,
          };
        }
        return {};
      },
    },
    mounted() {
      this.isVisible = true;
      if (this.autoDismiss) {
        this.timeout = window.setTimeout(this.hideSnackbar, this.duration);
      }
      if (this.backdrop) {
        this.previouslyFocusedElement = document.activeElement;
        this.previouslyFocusedElement.blur();
      }
    },
    beforeDestroy() {
      if (this.timeout) {
        window.clearTimeout(this.timeout);
      }
      if (this.backdrop) {
        this.previouslyFocusedElement.focus();
      }
    },
    methods: {
      hideSnackbar() {
        this.isVisible = false;
        this.$emit('hide');
      },
      handleActionClick() {
        this.isVisible = false;
        this.$emit('actionClicked');
      },
      focusSnackbarElement() {
        this.$refs.snackbar.$el.focus();
      },
      handleOnEnter() {
        if (this.backdrop) {
          this.focusSnackbarElement();
        }
      },
      trapFocus(e) {
        e.stopPropagation();
        this.focusSnackbarElement();
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .snackbar {
    position: fixed;
    bottom: 0;
    left: 0;
    z-index: 24;
    margin: 16px;

    &:focus {
      outline-style: none !important;
    }
  }

  .snackbar-backdrop {
    z-index: 24; // material dialog - ensures we cover KModal
  }

  .snackbar-enter-active {
    @extend %md-decelerate-func;
  }

  .snackbar-leave-active {
    @extend %md-accelerate-func;
  }

  .snackbar-enter-active,
  .snackbar-leave-active {
    transition-duration: 0.4s;
    transition-property: transform, opacity;
  }

  .snackbar-enter,
  .snackbar-leave-to {
    opacity: 0;
    transform: translateY(100px);
  }

</style>
