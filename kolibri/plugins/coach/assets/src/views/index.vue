<template>

  <core-base :topLevelPageName="topLevelPageName" :appBarTitle="$tr('coachTitle')">

    <div class="content">
      <template v-if="showTopNav">
        <class-selector :classes="classList" :currentClassId="classId" @changeClass="changeClass" />
        <top-nav />
      </template>

      <div v-if="userCanAccessPage">
        <component :is="currentPage" />
      </div>
      <auth-message v-else authorizedRole="adminOrCoach" />
    </div>

  </core-base>

</template>


<script>

  import { PageNames } from '../constants';
  import { isAdmin, isCoach, isSuperuser } from 'kolibri.coreVue.vuex.getters';
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
    name: 'coachRoot',
    $trs: {
      coachTitle: 'Coach',
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
          [PageNames.CLASS_LIST]: 'class-list-page',
          [PageNames.EXAMS]: 'exams-page',
          [PageNames.GROUPS]: 'groups-page',
          [PageNames.CREATE_EXAM]: 'create-exam-page',
          // reports
          [PageNames.RECENT_CHANNELS]: 'channel-list-page',
          [PageNames.RECENT_ITEMS_FOR_CHANNEL]: 'recent-items-page',
          [PageNames.RECENT_LEARNERS_FOR_ITEM]: 'learner-list-page',
          [PageNames.RECENT_LEARNER_ITEM_DETAILS]: 'learner-exercise-detail-page',
          [PageNames.TOPIC_CHANNELS]: 'channel-list-page',
          [PageNames.TOPIC_CHANNEL_ROOT]: 'item-list-page',
          [PageNames.TOPIC_ITEM_LIST]: 'item-list-page',
          [PageNames.TOPIC_LEARNERS_FOR_ITEM]: 'learner-list-page',
          [PageNames.TOPIC_LEARNER_ITEM_DETAILS]: 'learner-exercise-detail-page',
          [PageNames.LEARNER_LIST]: 'learner-list-page',
          [PageNames.LEARNER_CHANNELS]: 'channel-list-page',
          [PageNames.LEARNER_CHANNEL_ROOT]: 'item-list-page',
          [PageNames.LEARNER_ITEM_LIST]: 'item-list-page',
          [PageNames.LEARNER_ITEM_DETAILS]: 'learner-exercise-detail-page',
          [PageNames.EXAM_REPORT]: 'exam-report-page',
          [PageNames.EXAM_REPORT_DETAIL]: 'exam-report-detail-page',
        };
        return pageNameToComponentMap[this.pageName];
      },
      showTopNav() {
        return this.pageName !== PageNames.CLASS_LIST && this.userCanAccessPage;
      },
      userCanAccessPage() {
        return this.isCoach || this.isAdmin || this.isSuperuser;
      },
    },
    methods: {
      changeClass(classSelectedId) {
        if (this.pageName === PageNames.EXAM_REPORT) {
          this.$router.push({
            name: PageNames.EXAMS,
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
        isAdmin,
        isCoach,
        isSuperuser,
        classList: state => state.classList,
        classId: state => state.classId,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .content
    background-color: $core-bg-light
    padding: 1em

</style>
