<template>

  <button class="icon-button">
    <slot></slot>
    {{ text }}
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

</style>
