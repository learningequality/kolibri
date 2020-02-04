<template>

  <!-- Accessibility properties for the overlay -->
  <transition name="fade" appear>
    <div
      id="modal-window"
      ref="modal-overlay"
      class="modal-overlay"
      @keyup.esc.stop="emitCancelEvent"
      @keyup.enter="handleEnter"
    >
      <div
        ref="modal"
        class="modal"
        :tabindex="0"
        role="dialog"
        aria-labelledby="modal-title"
        :class="size"
        :style="[ modalSizeStyles, { background: $themeTokens.surface } ]"
      >

        <!-- Modal Title -->
        <h1
          id="modal-title"
          ref="title"
          class="title"
        >
          {{ title }}
          <!-- Accessible error reporting per @radina -->
          <span
            v-if="hasError"
            class="visuallyhidden"
          >
            {{ $tr('errorAlert', { title }) }}
          </span>
        </h1>

        <!-- Stop propagation of enter key to prevent the submit event from being emitted twice -->
        <form
          class="form"
          @submit.prevent="emitSubmitEvent"
          @keyup.enter.stop
        >
          <!-- Default slot for content -->
          <div
            ref="content"
            class="content"
            :style="[ contentSectionMaxHeight, scrollShadow ? {
              borderTop: `1px solid ${$themeTokens.fineLine}`,
              borderBottom: `1px solid ${$themeTokens.fineLine}`,
            } : {} ]"
            :class="{ 'scroll-shadow': scrollShadow }"
          >
            <slot></slot>
          </div>

          <div
            ref="actions"
            class="actions"
          >
            <!-- Slot for buttons -->
            <slot
              v-if="$slots.actions"
              name="actions"
            >
            </slot>
            <template v-else>
              <KButton
                v-if="cancelText"
                name="cancel"
                :text="cancelText"
                appearance="flat-button"
                :disabled="cancelDisabled || $attrs.disabled"
                @click="emitCancelEvent"
              />
              <KButton
                v-if="submitText"
                name="submit"
                :text="submitText"
                :primary="true"
                :disabled="submitDisabled || $attrs.disabled"
                type="submit"
              />
            </template>
          </div>
        </form>
      </div>
    </div>
  </transition>

</template>


<script>

  import logger from 'kolibri.lib.logging';
  import KResponsiveWindowMixin from 'kolibri-components/src/KResponsiveWindowMixin';
  import debounce from 'lodash/debounce';

  const logging = logger.getLogger(__filename);

  /**
   * Used to focus attention on a singular action/task
   */
  export default {
    name: 'KModal',
    mixins: [KResponsiveWindowMixin],
    props: {
      /**
       * The title of the modal
       */
      title: {
        type: String,
        required: true,
      },
      /**
       * The text of the submit button
       */
      submitText: {
        type: String,
        required: false,
      },
      /**
       * The text of the cancel button
       */
      cancelText: {
        type: String,
        required: false,
      },
      /**
       * Disable the submit button
       */
      submitDisabled: {
        type: Boolean,
        default: false,
      },
      /**
       * Disable the cancel button
       */
      cancelDisabled: {
        type: Boolean,
        default: false,
      },
      /**
       * How wide the modal should be.
       * Small - 300 px.
       * Medium - 450px.
       * Large - 100%.
       */
      size: {
        type: String,
        required: false,
        default: 'medium',
        validator(val) {
          return ['small', 'medium', 'large'].includes(val);
        },
      },
      /**
       * Toggles error message indicator in title
       */
      hasError: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        lastFocus: null,
        maxContentHeight: '1000',
        contentHeight: 0,
        scrollShadow: false,
        delayedEnough: false,
      };
    },
    computed: {
      modalSizeStyles() {
        return {
          'max-width': `${this.maxModalWidth - 32}px`,
          'max-height': `${this.windowHeight - 32}px`,
        };
      },
      maxModalWidth() {
        if (this.windowWidth < 1000) {
          return this.windowWidth;
        }
        return 1000;
      },
      contentSectionMaxHeight() {
        return {
          'max-height': `${this.maxContentHeight}px`,
          height: `${this.contentHeight}px`,
        };
      },
    },
    created() {
      if (this.$props.cancelText && !this.$listeners.cancel) {
        logging.warn(
          'A "cancelText" has been set, but there is no "cancel" listener. The "cancel" button may not work correctly.'
        );
      }
      if (this.$props.submitText && !this.$listeners.submit) {
        logging.warn(
          'A "submitText" has been set, but there is no "submit" listener. The "submit" button may not work correctly.'
        );
      }
    },
    beforeMount() {
      this.lastFocus = document.activeElement;
    },
    mounted() {
      // Remove scrollbars from the <html> tag, so user's can't scroll while modal is open
      window.document.documentElement.style['overflow'] = 'hidden';
      this.$nextTick(() => {
        if (this.$refs.modal && !this.$refs.modal.contains(document.activeElement)) {
          this.focusModal();
        }
      });
      window.addEventListener('focus', this.focusElementTest, true);
      window.setTimeout(() => (this.delayedEnough = true), 500);
    },
    updated() {
      this.updateContentSectionStyle();
    },
    destroyed() {
      // Restore scrollbars to <html> tag
      window.document.documentElement.style['overflow'] = '';
      window.removeEventListener('focus', this.focusElementTest, true);
      // Wait for events to finish propagating before changing the focus.
      // Otherwise the `lastFocus` item receives events such as 'enter'.
      window.setTimeout(() => this.lastFocus.focus());
    },
    methods: {
      /**
       * Calculate the max-height of the content section of the modal
       * If there is not enough vertical space, create a vertically scrollable area and a
       * scroll shadow
       */
      updateContentSectionStyle: debounce(function() {
        if (this.$refs.title && this.$refs.actions) {
          if (Math.abs(this.$refs.content.scrollHeight - this.contentHeight) >= 8) {
            this.contentHeight = this.$refs.content.scrollHeight;
          }
          const maxContentHeightCheck =
            this.windowHeight -
            this.$refs.title.clientHeight -
            this.$refs.actions.clientHeight -
            32;
          // to prevent max height from toggling between pixels
          // we set a threshold of how many pixels the height should change before we update
          if (Math.abs(maxContentHeightCheck - this.maxContentHeight) >= 8) {
            this.maxContentHeight = maxContentHeightCheck;
            this.scrollShadow = this.maxContentHeight < this.$refs.content.scrollHeight;
          }
        }
      }, 50),
      emitCancelEvent() {
        if (!this.cancelDisabled) {
          // Emitted when the cancel button is clicked or the esc key is pressed
          this.$emit('cancel');
        }
      },
      emitSubmitEvent() {
        if (!this.submitDisabled) {
          // Emitted when the submit button or the enter key is pressed
          this.$emit('submit');
        }
      },
      handleEnter() {
        if (this.delayedEnough) {
          this.emitSubmitEvent();
        }
      },
      focusModal() {
        this.$refs.modal.focus();
      },
      focusElementTest(event) {
        // switching apps - not relevant
        if (event.target === window) {
          return;
        }
        // not sure when this would be true
        if (!this.$refs.modal) {
          return;
        }
        // addresses https://github.com/learningequality/kolibri/issues/3824
        if (
          event.target === this.$refs.modal ||
          this.$refs.modal.contains(event.target.activeElement)
        ) {
          return;
        }
        // focus has escaped the modal - put it back!
        if (!this.$refs.modal.contains(event.target)) {
          this.focusModal();
        }
      },
    },
    $trs: {
      // error alerts
      errorAlert: 'Error in { title }',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 24;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    background-attachment: fixed;
    transition: opacity $core-time ease;
  }

  // TODO: margins for stacked buttons.
  .modal {
    @extend %dropshadow-16dp;

    position: absolute;
    top: 50%;
    left: 50%;
    margin: 0 auto;
    overflow-y: auto;
    border-radius: $radius;
    transform: translate(-50%, -50%);

    &:focus {
      outline: none;
    }
  }

  .form {
    @extend %momentum-scroll;
  }

  .fade-enter-active,
  .fade-leave-active {
    transition: all $core-time ease;
  }

  .fade-enter,
  .fade-leave-active {
    opacity: 0;
  }

  .title {
    padding: 24px;
    margin: 0;
    font-size: 24px;
  }

  .content {
    padding: 0 24px;
    overflow-y: auto;
  }

  .scroll-shadow {
    background: linear-gradient(white 30%, hsla(0, 0%, 100%, 0)),
      linear-gradient(hsla(0, 0%, 100%, 0) 10px, white 70%) bottom,
      radial-gradient(at top, rgba(0, 0, 0, 0.2), transparent 70%),
      radial-gradient(at bottom, rgba(0, 0, 0, 0.2), transparent 70%) bottom;
    background-repeat: no-repeat;
    background-attachment: local, local, scroll, scroll;
    background-size: 100% 20px, 100% 20px, 100% 10px, 100% 10px;
  }

  .actions {
    padding: 24px;
    text-align: right;
    button {
      margin: 0;
    }
  }

  .actions button:last-of-type {
    margin-left: 16px;
  }

  .small {
    width: 300px;
  }

  .medium {
    width: 450px;
  }

  .large {
    width: 100%;
  }

</style>
