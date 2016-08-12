<template>

  <div class="modal-root" v-on:keyup.esc="toggleModal">
    <div class="modal" v-if="modalstate" transition="modal">
      <div class="modal-wrapper">
        <div class="modal-container">
          <button @click="toggleModal" class="close-btn">
            <svg src="./close.svg"></svg>
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
              <button @click="toggleModal" class="close-btn">OK</button>
            </slot>
          </div>
        </div>
      </div>
    </div>

    <div @click="toggleModal">
      <slot name="openbtn">
        <button>{{ btntext }}</button>
      </slot>
    </div>
  </div>

</template>


<script>

  const actions = require('../../core-actions');

  module.exports = {

    methods: {
      toggleModal() {
        if (!this.modalstate) {
          this.togglemodal(true);
        } else {
          this.togglemodal(false);
        }
      },
    },
    vuex: {
      getters: {
        modalstate: state => state.core.login_modal_state,
      },
      actions: {
        togglemodal: actions.togglemodal,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .modal
    position: fixed
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
    width: 410px
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
