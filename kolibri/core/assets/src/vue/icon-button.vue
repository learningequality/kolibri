<template>

  <button class="icon-button">
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
    },
  };

</script>


<style lang="stylus">

  @require '~core-theme.styl'

  .icon-button

    svg
      vertical-align: middle
      fill: $core-action-normal
      transition: fill $core-time ease-out

    &:hover svg
      fill: $core-action-dark

</style>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .icon-button
    padding-right: 8px
    height: 36px

  .btn-text
    vertical-align: middle
    margin-right: 2px

  button:focus
    background:$core-action-light
    outline: none

</style>
