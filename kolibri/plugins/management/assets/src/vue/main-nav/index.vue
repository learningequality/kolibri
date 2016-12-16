<template>

  <!--TODO: VUE2 UNTESTED -->
  <div>
    <!--
      In order to get the nav to work right, it seemed necessary to
      have multiple root nodes in this template.

      TODO: would be best to refactor this.
    -->
    <nav-bar-item href="/learn/#/learn">
      <svg class="nav-icon" src="../icons/learn.svg"></svg>
      <div class="label">Learn</div>
    </nav-bar-item>
    <nav-bar-item href="/learn/#/explore">
      <svg class="nav-icon" src="../icons/explore.svg"></svg>
      <div class="label">Explore</div>
    </nav-bar-item>
    <nav-bar-item v-if="isAdminOrSuperuser" href="/coach">
      <svg class="nav-icon" src="../icons/coach.svg"></svg>
      <div class="label">Coach</div>
    </nav-bar-item>
    <nav-bar-item v-if="isAdminOrSuperuser" href="/management" :active="true">
      <svg class="nav-icon" src="../icons/manage.svg"></svg>
      <div class="label">Manage</div>
    </nav-bar-item>
  </div>

</template>


<script>

  const isAdminOrSuperuser = require('kolibri.coreVue.vuex.getters').isAdminOrSuperuser;

  module.exports = {
    components: {
      'nav-bar-item': require('kolibri.coreVue.components.navBarItem'),
    },
    vuex: {
      getters: {
        isAdminOrSuperuser,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.navBarItem'

  a.active:focus svg
    fill: $core-bg-light

  .nav-icon
    width: 40px
    height: 40px

</style>
