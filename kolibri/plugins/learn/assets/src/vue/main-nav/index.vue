<template>

  <!--
    In order to get the nav to work right, it seemed necessary to
    have multiple root nodes in this template.

    TODO: would be best to refactor this.
  -->
  <nav-bar-item :vlink="learnLink" :active="learnActive">
    <svg role="presentation" height="40" width="40" viewbox="0 0 24 24" src="../icons/learn.svg"></svg>
    <div class="label">{{ $tr('learn') }}</div>
  </nav-bar-item>
  <nav-bar-item :vlink="exploreLink" :active="exploreActive">
    <svg role="presentation" height="40" width="40" viewbox="0 0 24 24" src="../icons/explore.svg"></svg>
    <div class="label">{{ $tr('explore') }}</div>
  </nav-bar-item>
  <nav-bar-item v-if="isAdminOrSuperuser" href="/coach">
    <svg role="presentation" height="40" width="40" viewbox="0 0 24 24" src="../icons/coach.svg"></svg>
    <div class="label">Coach</div>
  </nav-bar-item>
  <nav-bar-item v-if="isAdminOrSuperuser" href="/management">
    <svg role="presentation" height="40" width="40" viewbox="0 0 24 24" src="../icons/manage.svg"></svg>
    <div class="label">{{ $tr('manage') }}</div>
  </nav-bar-item>

</template>


<script>

  const pageMode = require('../../state/getters').pageMode;
  const isAdminOrSuperuser = require('kolibri.coreVue.vuex.getters').isAdminOrSuperuser;
  const constants = require('../../state/constants');

  module.exports = {
    $trNameSpace: 'learnNav',
    $trs: {
      learn: 'Learn',
      explore: 'Explore',
      manage: 'Manage',
    },
    components: {
      'nav-bar-item': require('kolibri.coreVue.components.navBarItem'),
    },
    vuex: {
      getters: {
        kind: state => state.core.session.kind,
        isAdminOrSuperuser,
        pageMode,
      },
    },
    computed: {
      learnLink() {
        return { name: constants.PageNames.LEARN_ROOT };
      },
      learnActive() {
        return this.pageMode === constants.PageModes.LEARN;
      },
      exploreLink() {
        return { name: constants.PageNames.EXPLORE_ROOT };
      },
      exploreActive() {
        return this.pageMode === constants.PageModes.EXPLORE;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.navBarItem'

  a.active:focus svg
    fill: $core-bg-light

</style>
