<template>

  <!-- Accessibility properties for the overlay -->

  <!-- Aria-Hidden and TabIndex in .modal might not be necessary because of conditional rendering -->
  <!-- mostly there in case we switch to v-show -->
  <div class="modal-overlay"
    v-if="visible"
    @keydown.esc="closeModal"
    @click="bgClick($event)"
    v-el:modal-overlay
    id="modal-window"
    role="dialog"
    aria-labelledby="modal-title">

    <div class="modal" v-el:modal :tabindex="0" transition="modal">
      <!-- Close Button -->
      <button aria-label="close" @click="closeModal" class="btn-close">
        <svg src="../icons/close.svg"></svg>
      </button>

      <!-- Modal Title -->
      <!-- Not mandatory, but if available, names the modal according aria-labels -->
      <h1 v-show="!invisibleTitle" class="title" id="modal-title">
        <!-- Accessible error reporting per @radina -->
        <span v-if="error" class="visuallyhidden">
          Error in:
        </span>
          {{title}}
      </h1>

      <!-- Modal Content -->
      <slot name="body" class="modal-content" id="modal-holder" role="document">
        <p>
          To populate, add <code>slot="body"</code> to the HTML element you want to fill here.
        </p>
      </slot>

    </div>
  </div>

</template>


<script>

  const vue = require('vue');

  module.exports = {
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
      disableClose: {
        type: Boolean,
        default: false,
        required: false,
      },
      backgroundClickClose: {
        type: Boolean,
        default: true,
        required: false,
      },
      // useed to toggle error message in header
      error: {
        type: Boolean,
        default: false,
      },
    },
    ready() {
      if (this.disableClose) {
        this.$off('close');
      }
    },
    events: {
      open() {
        this.visible = true;
        this.lastFocus = document.activeElement;
        // Need to wait for DOM to update asynchronously, then get the modal element
        vue.nextTick(() => {
          this.focusModal();
          // pass in a function, not a function call.
          window.addEventListener('focusout', this.focusElementTest, true);
        });
      },
      close() {
        this.visible = false;
        // needs to be an exact match to the one that was assigned.
        window.removeEventListener('focusout', this.focusElementTest, true);
        this.lastFocus.focus();
      },
    },
    data() {
      return {
        visible: false,
        lastFocus: '',
      };
    },
    methods: {
      openModal() {
        // propogate open event here and in parent
        this.$dispatch('open');
      },
      closeModal() {
        this.$dispatch('close');
      },
      focusModal() {
        this.$els.modal.focus();
      },
      focusElementTest(event) {
        // FocusOut happens when the element is about to be blurred
        if (!this.$els.modal.contains(event.relatedTarget)) {
          this.focusModal();
        }
      },
      bgClick(clickEvent) {
        // check to make sure the area being clicked is the overlay, not the modal
        if (this.backgroundClickClose && (clickEvent.target === this.$els.modalOverlay)) {
          this.closeModal();
        }
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .modal-overlay
    position: fixed
    top: 0
    left: 0
    width: 100%
    height: 100%
    background: rgba(0, 0, 0, 0.7)
    // transition: opacity 0.3s ease

  .modal
    position: absolute
    top: 50%
    left: 50%
    transform: translate(-50%, -50%)
    width: 60%
    background: #fff
    max-width: 380px
    border-radius: $radius
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.33)
    transition: all 0.3s ease
    margin: 0 auto
    padding: 15px 30px

  .btn-close
    float: right
    color: $core-text-default
    border: none

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
