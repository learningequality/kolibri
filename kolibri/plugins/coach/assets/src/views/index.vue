<template>

  <core-base :topLevelPageName="topLevelPageName" :appBarTitle="$tr('coachTitle')">

    <top-nav v-if="showTopNav && isCoachAdminOrSuperuser" slot="tabs"/>

    <div slot="content" class="content">
      <div v-if="isCoachAdminOrSuperuser">
        <component :is="currentPage"/>
      </div>
      <div v-else class="login-message">
        <h1>{{ $tr('logInPrompt') }}</h1>
        <p>{{ $tr('logInCommand') }}</p>
      </div>
    </div>

  </core-base>

</template>


<script>

  const store = require('../state/store');
  const Constants = require('../constants');
  const isCoachAdminOrSuperuser = require('kolibri.coreVue.vuex.getters').isCoachAdminOrSuperuser;
  const TopLevelPageNames = require('kolibri.coreVue.vuex.constants').TopLevelPageNames;

  module.exports = {
    $trNameSpace: 'coachRoot',
    $trs: {
      coachTitle: 'Coach',
      logInPrompt: 'Did you forget to log in?',
      logInCommand: 'You must be logged in as an Admin to view this page.',
    },
    components: {
      'top-nav': require('./top-nav'),
      'class-list-page': require('./class-list-page'),
      'channel-list-page': require('./channel-list-page'),
      'recent-items-page': require('./recent-items-page'),
      'topics-page': require('./topics-page'),
      'exams-page': require('./exams-page'),
      'groups-page': require('./groups-page'),
      'core-base': require('kolibri.coreVue.components.coreBase'),
      'coach-exercise-render-page': require('./coach-exercise-render-page'),
    },
    computed: {
      topLevelPageName: () => TopLevelPageNames.COACH,
      currentPage() {
        if (this.pageName === Constants.PageNames.CLASS_LIST) {
          return 'class-list-page';
        } else if (this.pageName === Constants.PageNames.EXAMS) {
          return 'exams-page';
        } else if (this.pageName === Constants.PageNames.GROUPS) {
          return 'groups-page';
        } else if (this.pageName === Constants.PageNames.EXERCISE_RENDER) {
          return 'coach-exercise-render-page';
        } else if (this.pageName === Constants.PageNames.RECENT_REPORTS) {
          return 'recent-items-page';
        }
        return null;
      },
      showTopNav() {
        return this.pageName !== Constants.PageNames.CLASS_LIST;
      },
    },
    vuex: {
      getters: {
        pageName: state => state.pageName,
        isCoachAdminOrSuperuser,
      },
    },
    store,
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .content
    background-color: $core-bg-light
    padding: 1em

  .login-message
    text-align: center
    margin-top: 200px

</style>
