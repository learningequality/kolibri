<template>

  <div class="modal-root" v-on:keyup.esc="closeModal">
    <div class="modal" v-if="showModal" transition="modal">
      <div class="modal-wrapper">
        <div class="modal-container">
          <button @click="closeModal" class="close-btn">
            <svg src="close.svg"></svg>
            <span class="visuallyhidden">Close</span>
          </button>
          <div class="modal-header">
            <slot name="header">
              Kolibri
            </slot>
          </div>
          <div class="modal-body">
            <slot name="body">
              disappear in oblivion..
            </slot>
          </div>
          <div class="modal-footer">
            <slot name="footer">
              <button @click="closeModal" class="close-btn">OK</button>
            </slot>
          </div>
        </div>
      </div>
    </div>

    <div @click="openModal">
    <!-- wrap this named slot so that the openModal method logic is encapsulated inside this modal component, but the parent component can pass anything to this slot for styling purpose -->
      <slot name="openbtn">
        <button>{{ btntext }}</button>
      </slot>
    </div>
  </div>

</template>


<script>

  module.exports = {
    props: {
      btntext: {
        type: String,
        default: 'Open Modal',
      },
    },
    data() {
      return {
        showModal: false,
      };
    },
    methods: {
      openModal() {
        this.showModal = true;
      },
      closeModal() {
        this.showModal = false;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .modal
    position: fixed
    z-index: 1  // TODO: why is this necessary? fix search bar, don't add z-index
    top: 0
    left: 0
    width: 100%
    height: 100%
    background: rgba(0, 0, 0, 0.7)
    display: table
    transition: opacity 0.3s ease

  .modal-wrapper
    display: table-cell
    vertical-align: middle

  .modal-container
    background: #fff
    max-width: 380px
    border-radius: $radius
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.33)
    transition: all 0.3s ease
    margin: 0 auto
    padding: 20px 30px

  .modal-header
    font-weight: bold
    padding-bottom: 10px

  .modal-footer
    margin-top: 15px
    margin-bottom: 10px
    padding-bottom: inherit

  .close-btn
    float: right
    color: $core-text-default
    border: none

  .modal-enter, .modal-leave
    opacity: 0

  .modal-enter .modal-container,
  .modal-leave .modal-container
    -webkit-transform: scale(1.1)
    transform: scale(1.1)

</style>
