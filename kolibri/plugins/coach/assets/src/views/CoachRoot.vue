<template>

  <div>
    <core-base
      :immersivePage="currentPageIsImmersive"
      :appBarTitle="appBarTitle"
      :immersivePageIcon="immersivePageIcon"
      :immersivePageRoute="toolbarRoute"
      :immersivePagePrimary="immersivePagePrimary"
    >

      <template v-if="showCoachNav">
        <top-nav class="top-nav" />
        <nav-title
          class="nav-title"
          :className="className"
          :classCoaches="classCoaches"
        />
      </template>

      <!-- TODO need a better solution for passing in authMessage -->
      <component authorizedRole="adminOrCoach" :is="currentPage" />

    </core-base>
  </div>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import { TopLevelPageNames } from 'kolibri.coreVue.vuex.constants';
  import AuthMessage from 'kolibri.coreVue.components.AuthMessage';
  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import { PageNames } from '../constants';
  import { LessonsPageNames } from '../constants/lessonsConstants';
  import topNav from './top-nav';
  import classListPage from './class-list-page';
  import examsPage from './exams/CoachExamsPage';
  import createExamPage from './exams/create-exam-page';
  import examReportPage from './exams/exam-report-page';
  import examReportDetailPage from './exams/CoachExamReport';
  import groupsPage from './GroupsPage';
  import learnerExerciseDetailPage from './reports/learner-exercise-detail-page';
  import recentItemsPage from './reports/recent-items-page';
  import channelListPage from './reports/channel-list-page';
  import itemListPage from './reports/item-list-page';
  import learnerListPage from './reports/learner-list-page';
  import navTitle from './nav-title';
  import LessonsRootPage from './lessons/LessonsRootPage';
  import LessonSummaryPage from './lessons/LessonSummaryPage';
  import LessonResourceSelectionPage from './lessons/LessonResourceSelectionPage';
  import LessonContentPreviewPage from './lessons/LessonContentPreviewPage';
  import LessonResourceUserReportPage from './reports/learner-exercise-detail-page/learner-exercise-report';
  import LessonResourceUserSummaryPage from './lessons/LessonResourceUserSummaryPage';

  // IDEA set up routenames that all use the same PageName instead of doing this?
  // See Content Preview routes in app.js + PageName handling here
  const selectionPages = [LessonsPageNames.SELECTION, LessonsPageNames.SELECTION_ROOT];
  const resourceUserPages = [
    LessonsPageNames.RESOURCE_USER_SUMMARY,
    LessonsPageNames.RESOURCE_USER_REPORT,
  ];

  const immersivePages = [
    ...selectionPages,
    ...resourceUserPages,
    LessonsPageNames.CONTENT_PREVIEW,
    LessonsPageNames.RESOURCE_CLASSROOM_REPORT,
    PageNames.EXAM_REPORT_DETAIL,
  ];

  const pageNameToComponentMap = {
    [PageNames.CLASS_LIST]: classListPage,
    [PageNames.EXAMS]: examsPage,
    [PageNames.GROUPS]: groupsPage,
    [PageNames.CREATE_EXAM]: createExamPage,
    // reports
    [PageNames.RECENT_CHANNELS]: channelListPage,
    [PageNames.RECENT_ITEMS_FOR_CHANNEL]: recentItemsPage,
    [PageNames.RECENT_LEARNERS_FOR_ITEM]: learnerListPage,
    [PageNames.RECENT_LEARNER_ITEM_DETAILS]: learnerExerciseDetailPage,
    [PageNames.TOPIC_CHANNELS]: channelListPage,
    [PageNames.TOPIC_CHANNEL_ROOT]: itemListPage,
    [PageNames.TOPIC_ITEM_LIST]: itemListPage,
    [PageNames.TOPIC_LEARNERS_FOR_ITEM]: learnerListPage,
    [PageNames.TOPIC_LEARNER_ITEM_DETAILS]: learnerExerciseDetailPage,
    [PageNames.LEARNER_LIST]: learnerListPage,
    [PageNames.LEARNER_CHANNELS]: channelListPage,
    [PageNames.LEARNER_CHANNEL_ROOT]: itemListPage,
    [PageNames.LEARNER_ITEM_LIST]: itemListPage,
    [PageNames.LEARNER_ITEM_DETAILS]: learnerExerciseDetailPage,
    [PageNames.EXAM_REPORT]: examReportPage,
    [PageNames.EXAM_REPORT_DETAIL]: examReportDetailPage,
    // lessons
    [LessonsPageNames.ROOT]: LessonsRootPage,
    [LessonsPageNames.SUMMARY]: LessonSummaryPage,
    [LessonsPageNames.SELECTION_ROOT]: LessonResourceSelectionPage,
    [LessonsPageNames.SELECTION]: LessonResourceSelectionPage,
    [LessonsPageNames.CONTENT_PREVIEW]: LessonContentPreviewPage,
    [LessonsPageNames.RESOURCE_USER_SUMMARY]: LessonResourceUserSummaryPage,
    [LessonsPageNames.RESOURCE_USER_REPORT]: LessonResourceUserReportPage,
  };

  export default {
    name: 'CoachRoot',
    $trs: {
      coachToolbarHeader: 'Coach',
      selectPageToolbarHeader: 'Select resources',
      resourceUserPageToolbarHeader: 'Lesson Report Details',
      previewContentPageToolbarHeader: 'Preview resources',
      noAssignmentErrorHeader: "You aren't assigned to any classes",
      noAssignmentErrorSubheader:
        'To start coaching a class, please consult your Kolibri administrator',
    },
    components: {
      AuthMessage,
      topNav,
      CoreBase,
      navTitle,
    },
    computed: {
      ...mapGetters(['classCoaches', 'isAdmin', 'isCoach', 'isSuperuser']),
      ...mapState(['pageName', 'classList', 'className', 'classId']),
      ...mapState({
        toolbarRoute: state => state.pageState.toolbarRoute,
      }),
      topLevelPageName: () => TopLevelPageNames.COACH,
      currentPage() {
        if (!this.userCanAccessPage) {
          // TODO better solution
          return 'AuthMessage';
        }
        return pageNameToComponentMap[this.pageName] || null;
      },
      showCoachNav() {
        return (
          this.pageName !== PageNames.CLASS_LIST &&
          this.userCanAccessPage &&
          !this.currentPageIsImmersive
        );
      },
      currentPageIsImmersive() {
        return immersivePages.includes(this.pageName);
      },
      userCanAccessPage() {
        return this.isCoach || this.isAdmin || this.isSuperuser;
      },
      appBarTitle() {
        if (this.currentPageIsImmersive) {
          if (this.pageName === LessonsPageNames.CONTENT_PREVIEW) {
            return this.$tr('previewContentPageToolbarHeader');
          }
          if (selectionPages.includes(this.pageName)) {
            return this.$tr('selectPageToolbarHeader');
          }
          if (resourceUserPages.includes(this.pageName)) {
            return this.$tr('resourceUserPageToolbarHeader');
          }
        }
        return this.$tr('coachToolbarHeader');
      },
      immersivePageIcon() {
        const backButtonPages = [
          LessonsPageNames.CONTENT_PREVIEW,
          ...resourceUserPages,
          PageNames.EXAM_REPORT_DETAIL,
        ];
        if (backButtonPages.includes(this.pageName)) {
          return 'arrow_back';
        }
        return 'close';
      },
      immersivePagePrimary() {
        // TODO going to need to set a backgrund color
        if (
          this.pageName === LessonsPageNames.CONTENT_PREVIEW ||
          this.pageName === PageNames.EXAM_REPORT_DETAIL
        ) {
          return false;
        }
        return true;
      },
    },
  };

</script>


<style lang="scss" scoped>

  .top-nav {
    margin-bottom: 32px;
  }

  .nav-title {
    margin-bottom: 32px;
  }

</style>
