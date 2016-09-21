<template>

  <!-- Accessibility properties for the overlay -->
  <div class="modal-overlay"
    @keydown.esc="emitCancelEvent"
    @keydown.enter="emitEnterEvent"
    @click="bgClick($event)"
    v-el:modal-overlay
    id="modal-window">

    <div class="modal"
      v-el:modal
      :tabindex="0"
      transition="modal"
      role="dialog"
      aria-labelledby="modal-title">

      <div class="top-buttons">
        <button aria-label="Go back" @click="emitBackEvent" class="header-btn btn-back" v-if="enablebackbtn">
          <svg src="./back.svg" role="presentation"></svg>
        </button>
        <button aria-label="Close dialog window" @click="emitCancelEvent" class="header-btn btn-close">
          <svg src="./close.svg" role="presentation"></svg>
        </button>
      </div>

      <!-- Modal Title -->
      <h1 v-show="!invisibletitle" class="title" id="modal-title">
        <!-- Accessible error reporting per @radina -->
        <span v-if="haserror" class="visuallyhidden">Error in:</span>
        {{title}}
      </h1>

      <!-- Modal Content -->
      <slot>
        <p>To populate, wrap your content in <code> with modal </code>.</p>
      </slot>

    </div>
  </div>

</template>


<script>

  module.exports = {
    props: {
      title: {
        type: String,
        required: true,
      },
      invisibletitle: {
        type: Boolean,
        default: false,
      },
      // Modal options
      disableclose: {
        type: Boolean,
        default: false,
      },
      enablebgclickcancel: {
        type: Boolean,
        default: true,
      },
      enablebackbtn: {
        type: Boolean,
        default: false,
      },
      // toggles error message indicator in header
      haserror: {
        type: Boolean,
        default: false,
      },
    },
    attached() {
      this.lastFocus = document.activeElement;
      this.focusModal();
      window.addEventListener('blur', this.focusElementTest, true);
      window.addEventListener('scroll', this.preventScroll, true);
    },
    detached() {
      window.removeEventListener('blur', this.focusElementTest, true);
      window.removeEventListener('scroll', this.preventScroll, true);
      // Wait for events to finish propagating before changing the focus.
      // Otherwise the `lastFocus` item receives events such as 'enter'.
      window.setTimeout(() => this.lastFocus.focus());
    },
    data() {
      return {
        lastFocus: null,
      };
    },
    methods: {
      emitCancelEvent(event) {
        this.$emit('cancel');
      },
      emitEnterEvent(event) {
        this.$emit('enter');
      },
      emitBackEvent(event) {
        this.$emit('back');
      },
      focusModal() {
        this.$els.modal.focus();
      },
      focusElementTest(event) {
        // FocusOut happens when the element is about to be blurred
        if (this.$els.modal && !this.$els.modal.contains(event.relatedTarget)) {
          this.focusModal();
        }
      },
      preventScroll(event) {
        event.preventDefault();
      },
      bgClick(event) {
        // check to make sure the area being clicked is the overlay, not the modal
        if (this.enablebgclickcancel && (event.target === this.$els.modalOverlay)) {
          this.emitCancelEvent();
        }
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri/styles/coreTheme'

  .modal-overlay
    position: fixed
    top: 0
    left: 0
    width: 100%
    height: 100%
    background: rgba(0, 0, 0, 0.7)
    transition: opacity 0.3s ease
    background-attachment: fixed

  .modal
    position: absolute
    top: 50%
    left: 50%
    transform: translate(-50%, -50%)
    width: 60%
    background: #fff
    max-width: 380px
    max-height: 80%
    overflow-y: auto
    border-radius: $radius
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.33)
    transition: all 0.3s ease
    margin: 0 auto
    padding: 15px 30px
    @media (max-width: $portrait-breakpoint)
      width: 85%
      top: 45%

  .top-buttons
    position: relative
    height: 20px
    margin-bottom: 25px

  .header-btn
    color: $core-text-default
    border: none
    position: absolute

  .btn-back
    left: -25px

  .btn-close
    right: -25px

  .title
    text-align: center

  // Animation Specs
  .modal-enter, .modal-leave
    opacity: 0

  .modal-enter .modal-container,
  .modal-leave .modal-container
    -webkit-transform: scale(1.1)
    transform: scale(1.1)

</style>
