<template>

  <div class='nav-wrapper'>
    <nav class='nav-main' role="navigation" aria-label="Main user navigation">
      <slot></slot>
    </nav>
  </div>

</template>


<script>

  module.exports = {};

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'


  ///////////////////////////
  // Nav Wrapper Styles

  .nav-wrapper
    display: table
    background: $core-bg-light
    font-weight: 300
    position: fixed
    z-index: 2
    @media screen and (min-width: $portrait-breakpoint + 1)
      font-size: 1em
      height: 100%
    @media screen and (max-width: $portrait-breakpoint)
      font-size: 0.8em
      bottom: 0
      width: 100%

  .nav-main
    @media screen and (max-width: $portrait-breakpoint)
      display: table-row


  ///////////////////////////
  // content-specific styles

  .label
    text-align: center

  // the "scoped" styles below are a bit hacky:
  // the `a` tag is actually inside the child template
  a svg
    display: block
    margin: auto
    fill: $core-action-normal
    transition: fill $core-time ease-out
    @media screen and (max-width: $portrait-breakpoint)
      height: 30px

  a:hover svg
    fill: $core-action-dark

  a.active svg
    fill: $core-bg-light

  a.active:hover svg
    fill: $core-bg-light

</style>
