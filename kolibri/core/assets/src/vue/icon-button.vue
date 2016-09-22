<template>

  <button class="icon-button-scope" :class="{'primary' : this.primary}">
    <slot></slot>
    <span v-if="text" :class="bottomtext ? 'btn-bottom-text' : 'btn-text'">{{ text }}</span>
  </button>

</template>


<script>

  module.exports = {
    props: {
      text: {
        type: String,
      },
      primary: {
        type: Boolean,
        default: false,
      },
      bottomtext: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style lang="stylus">

  @require '~kolibri/styles/coreTheme'

  /*
    WARNING -- these styles are unscoped.
    ONLY include styles that need to apply to SVGs inserted into the slot.
    Make sure everything here is scoped under the .icon-button-scope class.
  */

  .icon-button-scope
    svg
      vertical-align: middle
      fill: $core-action-normal
      transition: fill $core-time ease-out
    &:hover svg
      fill: $core-action-dark
    &:disabled svg
      fill: $core-text-annotation

    // styles specific to primary button
  .icon-button-scope.primary
    svg
      fill: $core-bg-canvas
      transition: fill $core-time ease-out
    &:hover svg
      fill: $core-action-light
    &:disabled svg
      fill: $core-text-annotation

</style>


<style lang="stylus" scoped>

  @require '~kolibri/styles/coreTheme'

  button
    padding: 0.2em 2em
    height: 36px
    line-height: inherit

  .primary
    border: none
    color: $core-bg-canvas
    background-color: $core-action-normal
    &:hover
      color: $core-action-light
    &:disabled
      color: $core-bg-canvas
      background-color: $core-text-annotation

  .btn-text
    vertical-align: middle
    margin-right: 2px

  .btn-bottom-text
    display: block
    margin-top: 0.4em
    vertical-align: middle

</style>
