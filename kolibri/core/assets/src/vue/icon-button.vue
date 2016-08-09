<template>

  <button :class="[this.primary ? 'primary' : 'secondary', 'icon-button']">
    <slot></slot>
    <span class="btn-text">{{ text }}</span>
  </button>

</template>


<script>

  module.exports = {
    props: {
      text: {
        type: String,
        required: true,
      },
      // primary is true by default, will be primary unless specified
      primary: {
        type: Boolean,
        default: true,
      },
    },
  };

</script>


<style lang="stylus">

  @require '~core-theme.styl'

  svg
    vertical-align: middle

  // styles specific to primary button
  .primary
    svg
      fill: $core-action-normal
      transition: fill $core-time ease-out

    &:hover svg
      fill: $core-action-dark


  // styles specific to secondary button
  .secondary
    background-color: $core-action-normal
    border: none
    color: $core-bg-canvas

    // fighting button styling in core global. Need refactor
    &:hover
      color: $core-action-light
      border: none

    svg
      fill: $core-bg-canvas

</style>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .icon-button
    padding-right: 8px
    height: 36px

  .btn-text
    vertical-align: middle
    margin-right: 2px

</style>
