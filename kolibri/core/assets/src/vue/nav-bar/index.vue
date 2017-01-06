<template>

  <div class="nav-wrapper">
    <nav class="nav-main" role="navigation" :aria-label="ariaLabel">
      <nav-bar-item href="/learn/#/learn" :active="learnActive">
        <svg class="nav-icon" src="../icons/learn.svg"/>
        <div class="label">{{ $tr('learn') }}</div>
      </nav-bar-item>
      <nav-bar-item href="/learn/#/explore" :active="exploreActive">
        <svg class="nav-icon" src="../icons/explore.svg"/>
        <div class="label">{{ $tr('explore') }}</div>
      </nav-bar-item>
      <nav-bar-item v-if="isAdminOrSuperuser" href="/coach" :active="coachActive">
        <svg class="nav-icon" src="../icons/coach.svg"/>
        <div class="label">{{ $tr('coach') }}</div>
      </nav-bar-item>
      <nav-bar-item v-if="isAdminOrSuperuser" href="/management" :active="manageActive">
        <svg class="nav-icon" src="../icons/manage.svg"/>
        <div class="label">{{ $tr('manage') }}</div>
      </nav-bar-item>
      <session-nav-widget/>
    </nav>
  </div>

</template>


<script>

  const isAdminOrSuperuser = require('kolibri.coreVue.vuex.getters').isAdminOrSuperuser;
  const learnAppConstants = require('../../../../../plugins/learn/assets/src/state/constants');
  const pageMode = require('../../../../../plugins/learn/assets/src/state/getters').pageMode;
  const activeCoach = require(
    '../../../../../plugins/coach_tools/assets/src/state/getters').activeCoach;
  const activeManage = require(
    '../../../../../plugins/management/assets/src/state/getters').activeManage;

  module.exports = {
    $trNameSpace: 'navbar',
    $trs: {
      navigationLabel: 'Main user navigation',
      learn: 'Learn',
      explore: 'Explore',
      manage: 'Manage',
      coach: 'Coach',
    },
    computed: {
      ariaLabel() {
        return this.$tr('navigationLabel');
      },
      learnActive() {
        return this.pageMode === learnAppConstants.PageModes.LEARN;
      },
      exploreActive() {
        return this.pageMode === learnAppConstants.PageModes.EXPLORE;
      },
      coachActive() {
        return this.activeCoach;
      },
      manageActive() {
        return this.activeManage;
      },
    },
    components: {
      'session-nav-widget': require('../session-nav-widget'),
      'nav-bar-item': require('kolibri.coreVue.components.navBarItem'),
    },
    vuex: {
      getters: {
        session: state => state.core.session,
        kind: state => state.core.session.kind,
        isAdminOrSuperuser,
        pageMode,
        activeCoach,
        activeManage,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'
  @require '~kolibri.styles.navBarItem'

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

  a.active:focus svg
    fill: $core-bg-light

  .nav-icon
    width: 40px
    height: 40px

</style>
