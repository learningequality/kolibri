<template>

  <core-base :topLevelPageName="topLevelPageName" :appBarTitle="$tr('coachTitle')">

    <div v-if="isCoachAdminOrSuperuser" slot="content">
      <top-nav v-if="showTopNav"/>
      <component :is="currentPage"/>
    </div>

    <div v-else slot="content" class="login-message">
      <h1>{{ $tr('logInPrompt') }}</h1>
      <p>{{ $tr('logInCommand') }}</p>
    </div>

  </core-base>

</template>


<script>

  const store = require('../state/store');
  const constants = require('../constants');
  const isCoachAdminOrSuperuser = require('kolibri.coreVue.vuex.getters').isCoachAdminOrSuperuser;
  const TopLevelPageNames = require('kolibri.coreVue.vuex.constants').TopLevelPageNames;

  module.exports = {
    $trNameSpace: 'coach-root',
    $trs: {
      coachTitle: 'Coach',
      logInPrompt: 'Did you forget to log in?',
      logInCommand: 'You must be logged in as an Admin to view this page.',
    },
    components: {
      'top-nav': require('./top-nav'),
      'class-list-page': require('./class-list-page'),
      'recent-page': require('./recent-page'),
      'topics-page': require('./topics-page'),
      'exams-page': require('./exams-page'),
      'learners-page': require('./learners-page'),
      'groups-page': require('./groups-page'),
      'core-base': require('kolibri.coreVue.components.coreBase'),
      'coach-exercise-render-page': require('./coach-exercise-render-page'),
    },
    computed: {
      topLevelPageName: () => TopLevelPageNames.COACH,
      currentPage() {
        if (this.pageName === constants.PageNames.CLASS_LIST) {
          return 'class-list-page';
        }
        if (this.pageName === constants.PageNames.RECENT) {
          return 'recent-page';
        }
        if (this.pageName === constants.PageNames.TOPICS) {
          return 'topics-page';
        }
        if (this.pageName === constants.PageNames.EXAMS) {
          return 'exams-page';
        }
        if (this.pageName === constants.PageNames.LEARNERS) {
          return 'learners-page';
        }
        if (this.pageName === constants.PageNames.GROUPS) {
          return 'groups-page';
        }
        if (this.pageName === constants.PageNames.EXERCISE_RENDER) {
          return 'coach-exercise-render-page';
        }
        return null;
      },
      showTopNav() {
        return this.pageName !== constants.PageNames.CLASS_LIST;
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

  .login-message
    text-align: center
    margin-top: 200px

</style>
