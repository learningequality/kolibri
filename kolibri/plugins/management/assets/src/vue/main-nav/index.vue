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
  <nav-bar-item v-show="isAdmin" href="/management" :active="true">
    <svg role="presentation" height="40" width="40" viewbox="0 0 24 24" src="../icons/manage.svg"></svg>
    <div class="label">Manage</div>
  </nav-bar-item>

</template>


<script>

  const UserKinds = require('kolibri').constants.UserKinds;

  module.exports = {
    components: {
      'nav-bar-item': require('nav-bar-item'),
    },
    vuex: {
      getters: {
        isAdmin: state => state.core.session.kind === UserKinds.ADMIN,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~nav-bar-item.styl'

</style>
