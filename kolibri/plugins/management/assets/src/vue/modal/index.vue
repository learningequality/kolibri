<template>

  <!-- Accessibility properties for the overlay -->
  <div class="modal-overlay"
    v-if="showModal"
    @keyup.esc="closeModal"
    id="modal-window"
    aria-hidden="{{(!showModal).toString()}}"
    role="dialog"
    aria-labelledby="modal-title">

    <div class="modal" v-el:modal transition="modal">
      <!-- Close Button -->
      <button aria-label="close" @click="closeModal" class="btn-close">
        <svg src="../icons/close.svg"></svg>
      </button>

      <!-- Modal Content -->
      <slot name="body" class="modal-content" id="modal-holder" role="document">
        <p>
          To populate, add <code>slot="body"</code> to the HTML element you want to fill here.
        </p>
      </slot>

    </div>
  </div>

  <!-- Think this might be more appropriate as a boolean, or case-by-case -->
  <div v-if="btntext" @click="openModal">
  <!-- wrap this named slot so that the openModal method logic is encapsulated inside this modal component, but the parent component can pass anything to this slot for styling purpose -->
    <slot name="openbtn">
      <button>{{ btntext }}</button>
    </slot>
  </div>

</template>


<script>

  module.exports = {
    props: {
      // mostly keeping around for backwards compatibility
      // TODO get rid of this prop
      btntext: {
        type: String,
      },
      disableClose: {
        type: Boolean,
        default: false,
        required: false,
      },
    },
    events: {
      open() {
        this.showModal = true;
        this.lastFocus = document.activeElement;

        /* eslint-disable*/
        // Need to wait for DOM to update asynchronously, then get the modal element
        vue.nextTick(() => console.log(this.$get('$els.modal')));
        /* eslint-enable*/
      },
      close() {
        this.showModal = false;
        this.lastFocus.focus();
      },
    },
    data() {
      return {
        showModal: false,
        lastFocus: '',
      };
    },
    methods: {
      openModal() {
        // propogate open event here and in parent
        this.$dispatch('open');
        console.log(this.$els.modal);
      },
      closeModal() {
        // propogate close event here and in parent
        this.$dispatch('close');
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

  // Animation Specs
  .modal-enter, .modal-leave
    opacity: 0

  .modal-enter .modal-container,
  .modal-leave .modal-container
    -webkit-transform: scale(1.1)
    transform: scale(1.1)

</style>
