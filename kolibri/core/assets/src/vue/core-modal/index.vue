<template>

  <!-- Accessibility properties for the overlay -->
  <transition name="fade">
    <div class="modal-overlay"
      @keydown.esc="emitCancelEvent"
      @keydown.enter="emitEnterEvent"
      @click="bgClick($event)"
      ref="modal-overlay"
      id="modal-window">

      <div class="modal"
        ref="modal"
        :tabindex="0"
        role="dialog"
        aria-labelledby="modal-title">

        <div class="top-buttons" @keydown.enter.stop>
          <button :aria-label="$tr('goBack')" @click="emitBackEvent" class="header-btn btn-back" v-if="enableBackBtn">
            <mat-svg category="navigation" name="arrow_back"/>
          </button>
          <button :aria-label="$tr('closeWindow')" @click="emitCancelEvent" class="header-btn btn-close">
            <mat-svg category="navigation" name="close"/>
          </button>
        </div>

        <!-- Modal Title -->
        <h1 v-show="!invisibleTitle" class="title" id="modal-title">
          <!-- Accessible error reporting per @radina -->
          <span v-if="hasError" class="visuallyhidden">{{$tr('errorAlert')}}</span>
          {{title}}
        </h1>

        <!-- Modal Content -->
        <slot>
          <p>To populate, wrap your content with <code> modal </code>.</p>
        </slot>

      </div>
    </div>
  </transition>

</template>


<script>

  module.exports = {
    $trNameSpace: 'coreModal',
    $trs: {
      // error alerts
      errorAlert: 'Error in:',
      // aria labels
      goBack: 'Go Back',
      closeWindow: 'Close Window',
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
      enableBackBtn: {
        type: Boolean,
        default: false,
      },
      // toggles error message indicator in header
      hasError: {
        type: Boolean,
        default: false,
      },
    },
    mounted() {
      this.lastFocus = document.activeElement;
      this.$nextTick(() => {
        this.focusModal();
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
        this.$refs.modal.focus();
      },
      focusElementTest(event) {
        // switching apps - not relevant
        if (event.target === window) { return; }
        // not sure when this would be true
        if (!this.$refs.modal) { return; }
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
        if (this.enableBgClickCancel && (event.target === this.$refs.modalOverlay)) {
          this.emitCancelEvent();
        }
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .modal-overlay
    position: fixed
    top: 0
    left: 0
    width: 100%
    height: 100%
    background: rgba(0, 0, 0, 0.7)
    transition: opacity 0.3s ease
    background-attachment: fixed
    z-index: 10

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
    margin: 0 auto
    padding: 15px 30px

    &:focus
      outline: none

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
    left: -10px

  .btn-close
    right: -10px

  .title
    text-align: center

  .fade-enter-active, .fade-leave-active
    transition: all 0.3s ease

  .fade-enter, .fade-leave-active
    opacity: 0

</style>
