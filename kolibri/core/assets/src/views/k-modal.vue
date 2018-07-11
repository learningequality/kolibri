<template>

  <!-- Accessibility properties for the overlay -->
  <transition name="fade">
    <div
      class="modal-overlay"
      @keyup.esc="emitCancelEvent"
      @keyup.enter="emitSubmitEvent"
      ref="modal-overlay"
      id="modal-window"
    >
      <div
        class="modal"
        ref="modal"
        :tabindex="0"
        role="dialog"
        aria-labelledby="modal-title"
        :class="size"
        :style="modalMaxSize"
      >

        <!-- Modal Title -->
        <h1
          class="title"
          id="modal-title"
          ref="title"
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
          @submit.prevent="emitSubmitEvent"
          @keyup.enter.stop
        >
          <!-- Default slot for content -->
          <div
            class="content"
            ref="content"
            :style="contentSectionMaxHeight"
            :class="{ 'scroll-shadow': scrollShadow }"
          >
            <slot></slot>
          </div>

          <div
            class="actions"
            ref="actions"
          >
            <!-- Slot for buttons -->
            <slot
              v-if="$slots.actions"
              name="actions"
            >
            </slot>
            <template v-else>
              <k-button
                v-if="cancelText"
                name="cancel"
                :text="cancelText"
                appearance="flat-button"
                :disabled="cancelDisabled"
                @click="emitCancelEvent"
              />
              <k-button
                v-if="submitText"
                name="submit"
                :text="submitText"
                :primary="true"
                :disabled="submitDisabled"
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

  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import debounce from 'lodash/debounce';
  import kButton from 'kolibri.coreVue.components.kButton';

  /**
   * Used to focus attention on a singular action/task
   */
  export default {
    name: 'kModal',
    components: {
      kButton,
    },
    mixins: [responsiveWindow],
    $trs: {
      // error alerts
      errorAlert: 'Error in { title }',
    },
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
        scrollShadow: false,
      };
    },
    computed: {
      modalMaxSize() {
        return {
          'max-width': `${this.windowSize.width - 32}px`,
          'max-height': `${this.windowSize.height - 32}px`,
        };
      },
      contentSectionMaxHeight() {
        return { 'max-height': `${this.maxContentHeight}px` };
      },
    },
    beforeMount() {
      this.lastFocus = document.activeElement;
    },
    mounted() {
      this.$nextTick(() => {
        if (this.$refs.modal && !this.$refs.modal.contains(document.activeElement)) {
          this.focusModal();
        }
      });
      window.addEventListener('focus', this.focusElementTest, true);
      window.addEventListener('scroll', this.preventScroll, true);
    },
    updated() {
      this.updateContentSectionStyle();
    },
    destroyed() {
      window.removeEventListener('focus', this.focusElementTest, true);
      window.removeEventListener('scroll', this.preventScroll, true);
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
          this.maxContentHeight =
            this.windowSize.height -
            this.$refs.title.clientHeight -
            this.$refs.actions.clientHeight -
            32;
          this.scrollShadow = this.maxContentHeight < this.$refs.content.scrollHeight;
        }
      }, 100),
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
      preventScroll(event) {
        event.preventDefault();
      },
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
    transition: opacity 0.3s ease;
  }

  // TODO: margins for stacked buttons.
  .modal {
    position: absolute;
    top: 50%;
    left: 50%;
    margin: 0 auto;
    overflow-y: auto;
    background: $core-bg-light;
    border-radius: $radius;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.33);
    transform: translate(-50%, -50%);

    &:focus {
      outline: none;
    }
  }

  .fade-enter-active,
  .fade-leave-active {
    transition: all 0.3s ease;
  }

  .fade-enter,
  .fade-leave-active {
    opacity: 0;
  }

  .title {
    padding: 24px;
    margin: 0;
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
    border-top: 1px solid $core-grey;
    border-bottom: 1px solid $core-grey;
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
