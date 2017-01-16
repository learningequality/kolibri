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
      <nav-bar-item v-if="isCoachAdminOrSuperuser" href="/coach" :active="coachActive">
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

  const values = require('lodash.values');
  const getters = require('kolibri.coreVue.vuex.getters');
  const TopLevelPageNames = require('kolibri.coreVue.vuex.constants').TopLevelPageNames;


  module.exports = {
    $trNameSpace: 'navbar',
    $trs: {
      navigationLabel: 'Main user navigation',
      learn: 'Learn',
      explore: 'Explore',
      manage: 'Manage',
      coach: 'Coach',
    },
    props: {
      topLevelPageName: {
        type: String,
        validator(value) {
          if (!value) {
            return true; // Okay if it's undefined
          }
          return values(TopLevelPageNames).includes(value);
        },
      },
    },
    computed: {
      ariaLabel() {
        return this.$tr('navigationLabel');
      },
      learnActive() {
        return this.topLevelPageName === TopLevelPageNames.LEARN_LEARN;
      },
      exploreActive() {
        return this.topLevelPageName === TopLevelPageNames.LEARN_EXPLORE;
      },
      coachActive() {
        return this.topLevelPageName === TopLevelPageNames.COACH;
      },
      manageActive() {
        return this.topLevelPageName === TopLevelPageNames.MANAGE;
      },
    },
    components: {
      'session-nav-widget': require('../session-nav-widget'),
      'nav-bar-item': require('kolibri.coreVue.components.navBarItem'),
    },
    vuex: {
      getters: {
        session: state => state.core.session,
        isAdminOrSuperuser: getters.isAdminOrSuperuser,
        isCoachAdminOrSuperuser: getters.isCoachAdminOrSuperuser,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'
  @require '~kolibri.styles.navBarItem'

  .nav-wrapper
    display: table
    table-layout: fixed
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
      min-width: 300px

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
