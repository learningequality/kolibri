<template>

  <div class='nav-wrapper'>
    <nav class='nav-main' role="navigation" aria-label="Main user navigation">
      <slot></slot>
      <session-nav-widget></session-nav-widget>
    </nav>
  </div>

</template>


<script>

  module.exports = {
    components: {
      'session-nav-widget': require('../session-nav-widget'),
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .nav-wrapper
    display: table
    background: $core-bg-light
    font-weight: 300
    position: fixed
    z-index: auto
    @media screen and (min-width: $portrait-breakpoint + 1)
      font-size: 1em
      height: 100%
    @media screen and (max-width: $portrait-breakpoint)
      font-size: 0.8em
      bottom: 0
      width: 100%

  .nav-main
    background: $core-bg-light
    height: 100vh
    @media screen and (max-width: $portrait-breakpoint)
      display: table-row
      height: auto

</style>
