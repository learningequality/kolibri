<template>

  <core-base :topLevelPageName="topLevelPageName" :appBarTitle="$tr('coachTitle')">

    <div class="content">
      <template v-if="showTopNav">
        <class-selector :classes="classList" :currentClassId="classId" @changeClass="changeClass"/>
        <top-nav/>
      </template>

      <div v-if="isCoach || isAdmin">
        <component :is="currentPage"/>
      </div>
      <div v-else-if="isSuperuser">
        <h1>{{ $tr('superUserPrompt') }}</h1>
        <p>{{ $tr('superUserCommand') }}</p>
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
  const coreGetters = require('kolibri.coreVue.vuex.getters');
  const TopLevelPageNames = require('kolibri.coreVue.vuex.constants').TopLevelPageNames;

  module.exports = {
    $trNameSpace: 'coachRoot',
    $trs: {
      coachTitle: 'Coach',
      logInPrompt: 'Did you forget to sign in?',
      logInCommand: 'You must be signed in as an Admin to view this page.',
      superUserPrompt: 'Signed in as device owner',
      superUserCommand: 'The coach tools cannot be used by a device owner. Please sign in as an administrator or coach.',
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
      // reports
      'learner-exercise-detail-page': require('./reports/learner-exercise-detail-page'),
      'recent-items-page': require('./reports/recent-items-page'),
      'channel-list-page': require('./reports/channel-list-page'),
      'item-list-page': require('./reports/item-list-page'),
      'learner-list-page': require('./reports/learner-list-page'),
      'class-selector': require('./class-selector'),
    },
    computed: {
      topLevelPageName: () => TopLevelPageNames.COACH,
      currentPage() {
        const pageNameToComponentMap = {
          [Constants.PageNames.CLASS_LIST]: 'class-list-page',
          [Constants.PageNames.EXAMS]: 'exams-page',
          [Constants.PageNames.GROUPS]: 'groups-page',
          [Constants.PageNames.CREATE_EXAM]: 'create-exam-page',
          // reports
          [Constants.PageNames.RECENT_CHANNELS]: 'channel-list-page',
          [Constants.PageNames.RECENT_ITEMS_FOR_CHANNEL]: 'recent-items-page',
          [Constants.PageNames.RECENT_LEARNERS_FOR_ITEM]: 'learner-list-page',
          [Constants.PageNames.RECENT_LEARNER_ITEM_DETAILS]: 'learner-exercise-detail-page',
          [Constants.PageNames.TOPIC_CHANNELS]: 'channel-list-page',
          [Constants.PageNames.TOPIC_CHANNEL_ROOT]: 'item-list-page',
          [Constants.PageNames.TOPIC_ITEM_LIST]: 'item-list-page',
          [Constants.PageNames.TOPIC_LEARNERS_FOR_ITEM]: 'learner-list-page',
          [Constants.PageNames.TOPIC_LEARNER_ITEM_DETAILS]: 'learner-exercise-detail-page',
          [Constants.PageNames.LEARNER_LIST]: 'item-list-page',
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
        return this.pageName !== Constants.PageNames.CLASS_LIST && (this.isCoach || this.isAdmin);
      },
    },
    methods: {
      changeClass(classSelectedId) {
        if (this.pageName === Constants.PageNames.EXAM_REPORT) {
          this.$router.push({
            name: Constants.PageNames.EXAMS,
            params: { classId: classSelectedId },
          });
        } else {
          this.$router.push({
            params: { classId: classSelectedId },
          });
        }
      },
    },
    vuex: {
      getters: {
        pageName: state => state.pageName,
        isSuperuser: coreGetters.isSuperuser,
        isAdmin: coreGetters.isAdmin,
        isCoach: coreGetters.isCoach,
        classList: state => state.classList,
        classId: state => state.classId,
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
