<template>

  <!-- Accessibility properties for the overlay -->
  <transition name="fade">
    <div
      class="modal-overlay"
      @keydown.esc="emitCancelEvent"
      @keydown.enter="emitEnterEvent"
      @click="bgClick($event)"
      ref="modal-overlay"
      id="modal-window"
    >

      <div
        class="modal"
        ref="modal"
        :tabindex="0"
        role="dialog"
        aria-labelledby="modal-title"
        :class="{ mobile: windowSize.breakpoint <= 1 }"
        :style="{ width: width, height: height }"
      >

        <!-- Modal Title -->
        <h1 v-show="!invisibleTitle" class="title" id="modal-title">
          <!-- Accessible error reporting per @radina -->
          <span v-if="hasError" class="visuallyhidden">{{ $tr('errorAlert') }}</span>
          {{ title }}
        </h1>

        <!-- Modal Content -->
        <slot></slot>

      </div>
    </div>
  </transition>

</template>


<script>

  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';

  export default {
    name: 'coreModal',
    mixins: [responsiveWindow],
    $trs: {
      // error alerts
      errorAlert: 'Error in',
      // aria labels
      closeWindow: 'Close window',
    },
    props: {
      title: {
        type: String,
        required: true,
      },
      invisibleTitle: {
        type: Boolean,
        default: false,
      },
      // Modal options
      disableclose: {
        type: Boolean,
        default: false,
      },
      enableBgClickCancel: {
        type: Boolean,
        default: true,
      },
      // toggles error message indicator in header
      hasError: {
        type: Boolean,
        default: false,
      },
      // Specifies a custom width for the modal
      width: {
        type: String,
        required: false,
      },
      // Specifies a custom height for the modal
      height: {
        type: String,
        required: false,
      },
    },
    data() {
      return {
        lastFocus: null,
      };
    },
    beforeMount() {
      this.lastFocus = document.activeElement;
    },
    mounted() {
      this.$nextTick(() => {
        if (!this.$refs.modal.contains(document.activeElement)) {
          this.focusModal();
        }
      });
      window.addEventListener('focus', this.focusElementTest, true);
      window.addEventListener('scroll', this.preventScroll, true);
    },
    destroyed() {
      window.removeEventListener('focus', this.focusElementTest, true);
      window.removeEventListener('scroll', this.preventScroll, true);
      // Wait for events to finish propagating before changing the focus.
      // Otherwise the `lastFocus` item receives events such as 'enter'.
      window.setTimeout(() => this.lastFocus.focus());
    },
    methods: {
      emitCancelEvent() {
        this.$emit('cancel');
      },
      emitEnterEvent() {
        this.$emit('enter');
      },
      emitBackEvent() {
        this.$emit('back');
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
      bgClick(event) {
        // check to make sure the area being clicked is the overlay, not the modal
        if (this.enableBgClickCancel && event.target === this.$refs.modalOverlay) {
          this.emitCancelEvent();
        }
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .modal-overlay
    position: fixed
    top: 0
    left: 0
    width: 100%
    height: 100%
    background: rgba(0, 0, 0, 0.7)
    transition: opacity 0.3s ease
    background-attachment: fixed
    z-index: 24

  .modal
    position: absolute
    top: 50%
    left: 50%
    transform: translate(-50%, -50%)
    background: #fff
    max-width: 90%
    max-height: 90%
    overflow-y: auto
    border-radius: $radius
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.33)
    margin: 0 auto
    padding: 15px 30px

    &:focus
      outline: none

  .modal.mobile
    width: 85%

  .btn-close
    right: -10px

  .fade-enter-active, .fade-leave-active
    transition: all 0.3s ease

  .fade-enter, .fade-leave-active
    opacity: 0

  >>>.core-modal-buttons
    text-align: right

  >>>.core-modal-buttons button:last-of-type
    margin-right: 0

</style>
