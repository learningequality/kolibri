<template>

  <!--
    In order to get the nev to work right, it seemed necessary to
    have multiple root nodes in this template.

    TODO: would be best to refactor this.
  -->
  <nav-bar-item href="/learn/#!/learn">
    <svg role="presentation" height="40" width="40" viewbox="0 0 24 24" src="../icons/learn.svg"></svg>
    <div class="label">Learn</div>
  </nav-bar-item>
  <nav-bar-item href="/learn/#!/explore">
    <svg role="presentation" height="40" width="40" viewbox="0 0 24 24" src="../icons/explore.svg"></svg>
    <div class="label">Explore</div>
  </nav-bar-item>
  <nav-bar-item href="/management" :active="true">
    <svg role="presentation" height="40" width="40" viewbox="0 0 24 24" src="../icons/manage.svg"></svg>
    <div class="label">Manage</div>
  </nav-bar-item>

</template>


<script>

  module.exports = {
    components: {
      'nav-bar-item': require('nav-bar-item'),
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

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
