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
      <auth-message
        v-else-if="isSuperuser"
        :header="$tr('superUserPrompt')"
        :details="$tr('superUserCommand')"
      />
      <auth-message v-else authorizedRole="adminOrCoach" />
    </div>

  </core-base>

</template>


<script>

  import store from '../state/store';
  import * as Constants from '../constants';
  import * as coreGetters from 'kolibri.coreVue.vuex.getters';
  import { TopLevelPageNames } from 'kolibri.coreVue.vuex.constants';
  import authMessage from 'kolibri.coreVue.components.authMessage';
  import topNav from './top-nav';
  import classListPage from './class-list-page';
  import examsPage from './exams-page';
  import createExamPage from './create-exam-page';
  import examReportPage from './exam-report-page';
  import examReportDetailPage from './exam-report-detail-page';
  import groupsPage from './groups-page';
  import coreBase from 'kolibri.coreVue.components.coreBase';
  import learnerExerciseDetailPage from './reports/learner-exercise-detail-page';
  import recentItemsPage from './reports/recent-items-page';
  import channelListPage from './reports/channel-list-page';
  import itemListPage from './reports/item-list-page';
  import learnerListPage from './reports/learner-list-page';
  import classSelector from './class-selector';
  export default {
    $trNameSpace: 'coachRoot',
    $trs: {
      coachTitle: 'Coach',
      superUserPrompt: 'Signed in as device owner',
      superUserCommand:
        'The coach tools cannot be used by a device owner. Please sign in as an administrator or coach.',
    },
    components: {
      authMessage,
      topNav,
      classListPage,
      examsPage,
      createExamPage,
      // reports
      examReportPage,
      examReportDetailPage,
      groupsPage,
      coreBase,
      learnerExerciseDetailPage,
      recentItemsPage,
      channelListPage,
      itemListPage,
      learnerListPage,
      classSelector,
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
          [Constants.PageNames.LEARNER_LIST]: 'learner-list-page',
          [Constants.PageNames.LEARNER_CHANNELS]: 'channel-list-page',
          [Constants.PageNames.LEARNER_CHANNEL_ROOT]: 'item-list-page',
          [Constants.PageNames.LEARNER_ITEM_LIST]: 'item-list-page',
          [Constants.PageNames.LEARNER_ITEM_DETAILS]: 'learner-exercise-detail-page',
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
          this.$router.push({ params: { classId: classSelectedId } });
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

</style>
