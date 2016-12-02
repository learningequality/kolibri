<template>

  <button class="icon-button-scope" :class="{'primary' : primary, 'single-line': !textbelow}">
    <slot></slot>
    <span v-if="text" class="btn-text" :class="{'btn-bottom-text' : textbelow, 'icon-padding' : !textbelow && hasIcon}">
      {{ text }}
    </span>
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
      textbelow: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      hasIcon() {
        // check if the parent passed anything into the slot
        // $slots returns an empty object if nothing is passed in.
        return !(Object.keys(this.$slots).length === 0 && this.$slots.constructor === Object);
      },
    },
  };

</script>


<style lang="stylus">

  @require '~kolibri.styles.coreTheme'

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
      fill: $core-text-disabled

  // styles specific to primary button
  .icon-button-scope.primary
    svg
      fill: $core-bg-canvas
      transition: fill $core-time ease-out
    &:hover svg
      fill: $core-bg-canvas
    &:disabled svg
      fill: $core-bg-canvas

</style>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  button
    padding: 0.2em 2em
    line-height: inherit

  button.single-line
    height: 36px

  .primary
    border: none
    color: $core-bg-canvas
    background-color: $core-action-normal
    transition: background-color $core-time ease-out

    &:hover
      color: $core-bg-canvas
      background-color: $core-action-dark
    &:disabled
      color: $core-bg-canvas
      background-color: $core-text-disabled

  /* displayed to visually balance an icon */
  .icon-padding
    margin-right: 2px

  .btn-text
    vertical-align: middle

  .btn-bottom-text
    display: block
    margin-top: 0.4em

</style>
