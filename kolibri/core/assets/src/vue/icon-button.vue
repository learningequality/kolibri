<template>

  <button :class="[this.primary ? 'primary' : 'secondary', 'icon-button']">
    <slot></slot>
    <span v-if="text" class="btn-text">{{ text }}</span>
    <span v-if="bottomtext" class="btn-bottom-text">{{ bottomtext }}</span>
  </button>

</template>


<script>

  module.exports = {
    props: {
      // text display next to icon
      text: {
        type: String,
        // why did we want this to be required?
        required: false,
      },
      // text display underneath the icon
      bottomtext: {
        type: String,
        required: false,
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

    &:disabled svg
      fill: $core-text-annotation

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
        fill: $core-action-light

    &:disabled
      color: $core-text-annotation
      border: none
      svg
        fill: $core-text-annotation

    svg
      fill: $core-bg-canvas
      transition: fill $core-time ease-out

</style>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .icon-button
    height: 36px

  .btn-text
    vertical-align: middle
    margin-right: 2px

  .btn-bottom-text
    display: block
    margin-top: 0.4em
    vertical-align: middle

</style>
