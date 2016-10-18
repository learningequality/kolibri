<template>

  <!--
    In order to get the nev to work right, it seemed necessary to
    have multiple root nodes in this template.

    TODO: would be best to refactor this.
  -->
  <nav-bar-item href="/learn">
    <svg role="presentation" height="40" width="40" viewbox="0 0 24 24" src="../icons/learn.svg"></svg>
    <div class="label">{{ $tr('learn') }}</div>
  </nav-bar-item>
  <nav-bar-item href="/explore">
    <svg role="presentation" height="40" width="40" viewbox="0 0 24 24" src="../icons/explore.svg"></svg>
    <div class="label">{{ $tr('explore') }}</div>
  </nav-bar-item>
  <nav-bar-item v-if="isAdminOrSuperuser" href="/management">
    <svg role="presentation" height="40" width="40" viewbox="0 0 24 24" src="../icons/manage.svg"></svg>
    <div class="label">{{ $tr('manage') }}</div>
  </nav-bar-item>
  <nav-bar-item href="/coach" :active="true">
    <svg role="presentation" height="40" width="40" viewbox="0 0 24 24" src="../icons/coach.svg"></svg>
    <div class="label">Coach</div>
  </nav-bar-item>

</template>


<script>

  module.exports = {
    $trNameSpace: 'coachNav',
    $trs: {
      learn: 'Learn',
      explore: 'Explore',
      manage: 'Manage',
    },
    components: {
      'nav-bar-item': require('kolibri/coreVue/components/navBarItem'),
    },
    vuex: {},
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri/styles/navBarItem'

  a.active:focus svg
    fill: $core-bg-light

</style>
