<template>

  <!--
    In order to get the nev to work right, it seemed necessary to
    have multiple root nodes in this template.

    TODO: would be best to refactor this.
  -->
  <nav-bar-item :vlink="learnLink" :active="learnActive">
    <svg role="presentation" height="40" width="40" viewbox="0 0 24 24" src="../icons/learn.svg"></svg>
    <div class="label">Learn</div>
  </nav-bar-item>
  <nav-bar-item :vlink="exploreLink" :active="exploreActive">
    <svg role="presentation" height="40" width="40" viewbox="0 0 24 24" src="../icons/explore.svg"></svg>
    <div class="label">Explore</div>
  </nav-bar-item>
  <nav-bar-item v-if="isAdminOrSuperuser" href="/management">
    <svg role="presentation" height="40" width="40" viewbox="0 0 24 24" src="../icons/manage.svg"></svg>
    <div class="label">Manage</div>
  </nav-bar-item>

</template>


<script>

  const pageMode = require('../../state/getters').pageMode;
  const constants = require('../../state/constants');
  const UserKinds = require('core-constants').UserKinds;

  module.exports = {
    components: {
      'nav-bar-item': require('nav-bar-item'),
    },
    vuex: {
      getters: {
        kind: state => state.core.session.kind,
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
      isAdminOrSuperuser() {
        if (this.kind[0] === UserKinds.SUPERUSER || this.kind[0] === UserKinds.ADMIN) {
          return true;
        }
        return false;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~nav-bar-item.styl'

  a.active:focus svg
    fill: $core-bg-light

</style>
