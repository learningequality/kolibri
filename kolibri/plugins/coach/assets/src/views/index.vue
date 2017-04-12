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
      'exams-page': require('./exams-page'),
      'create-exam-page': require('./create-exam-page'),
      'exam-report-page': require('./exam-report-page'),
      'exam-report-detail-page': require('./exam-report-detail-page'),
      'groups-page': require('./groups-page'),
      'core-base': require('kolibri.coreVue.components.coreBase'),
      'coach-exercise-render-page': require('./coach-exercise-render-page'),
      // reports
      'recent-items-page': require('./recent-items-page'),
      'channel-list-page': require('./channel-list-page'),
      'item-list-page': require('./item-list-page'),
    },
    computed: {
      topLevelPageName: () => TopLevelPageNames.COACH,
      currentPage() {
        const pageNameToComponentMap = {
          [Constants.PageNames.CLASS_LIST]: 'class-list-page',
          [Constants.PageNames.EXAMS]: 'exams-page',
          [Constants.PageNames.GROUPS]: 'groups-page',
          [Constants.PageNames.EXERCISE_RENDER]: 'coach-exercise-render-page',
          [Constants.PageNames.CREATE_EXAM]: 'create-exam-page',
          // reports
          [Constants.PageNames.RECENT_CHANNELS]: 'channel-list-page',
          [Constants.PageNames.RECENT_ITEMS_FOR_CHANNEL]: 'recent-items-page',
          [Constants.PageNames.RECENT_LEARNERS_FOR_ITEM]: 'learner-list-page',
          [Constants.PageNames.RECENT_LEARNER_ITEM_DETAILS]: 'learner-item-details-page',
          [Constants.PageNames.TOPIC_CHANNELS]: 'channel-list-page',
          [Constants.PageNames.TOPIC_CHANNEL_ROOT]: 'item-list-page',
          [Constants.PageNames.TOPIC_ITEM_LIST]: 'item-list-page',
          [Constants.PageNames.TOPIC_LEARNERS_FOR_ITEM]: 'learner-list-page',
          [Constants.PageNames.TOPIC_LEARNER_ITEM_DETAILS]: 'learner-item-details-page',
          [Constants.PageNames.LEARNER_LIST]: 'learner-list-page',
          [Constants.PageNames.LEARNER_CHANNELS]: 'channel-list-page',
          [Constants.PageNames.LEARNER_CHANNEL_ROOT]: 'item-list-page',
          [Constants.PageNames.LEARNER_ITEM_LIST]: 'item-list-page',
          [Constants.PageNames.LEARNER_ITEM_DETAILS]: 'learner-item-details-page',
          [Constants.PageNames.EXAM_REPORT]: 'exam-report-page',
          [Constants.PageNames.EXAM_REPORT_DETAIL]: 'exam-report-detail-page',
        };
        return pageNameToComponentMap[this.pageName];
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
