<template>

  <button v-bind:class="['icon-button', primary ? 'primary' : 'secondary']">
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
      // primary is false by default, will be secondary unless specified
      primary: false,
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
    background-color: $core-action-dark
    border: none
    color: $core-action-light

    // fighting button styling in core global. Need refactor
    &:hover
      color: $core-action-light
      border: none

    svg
      fill: $core-action-light

</style>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .icon-button
    padding-right: 8px
    height: 36px

  .icon-button:focus
    background:$core-action-light
    outline: none

  .btn-text
    vertical-align: middle
    margin-right: 2px

</style>
