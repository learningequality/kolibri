<template>

  <div class="nav-wrapper">
    <nav class="nav-main" role="navigation" :aria-label="ariaLabel">
      <slot></slot>
      <session-nav-widget></session-nav-widget>
    </nav>
  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'navbar',
    $trs: {
      navigationLabel: 'Main user navigation',
    },
    computed: {
      ariaLabel() {
        return this.$tr('navigationLabel');
      },
    },
    components: {
      'session-nav-widget': require('../session-nav-widget'),
    },
    vuex: {
      getters: {
        session: state => state.core.session,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .nav-wrapper
    display: table
    background: $core-bg-light
    font-weight: 300
    position: fixed
    z-index: auto
    @media screen and (min-width: $portrait-breakpoint + 1)
      font-size: 1em
      height: 100%
      width: $nav-width
    @media screen and (max-width: $portrait-breakpoint)
      font-size: 0.8em
      bottom: 0
      width: 100%

  .nav-main
    background: $core-bg-light
    height: 100vh
    @media screen and (max-width: $portrait-breakpoint)
      display: table-row
      height: $nav-portrait-height

</style>
