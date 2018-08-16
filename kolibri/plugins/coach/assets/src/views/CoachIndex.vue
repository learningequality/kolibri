<template>

  <div>
    <CoreBase
      :immersivePage="currentPageIsImmersive"
      :appBarTitle="appBarTitle"
      :immersivePageIcon="immersivePageIcon"
      :immersivePageRoute="toolbarRoute"
      :immersivePagePrimary="immersivePagePrimary"
      :authorized="userCanAccessPage"
      authorizedRole="adminOrCoach"
    >

      <template v-if="showCoachNav">
        <TopNav class="top-nav" />
        <NavTitle
          class="nav-title"
          :className="className"
          :classCoaches="classCoaches"
        />
      </template>

      <component :is="currentPage" />

    </CoreBase>
  </div>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import { TopLevelPageNames } from 'kolibri.coreVue.vuex.constants';
  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import { PageNames } from '../constants';
  import { LessonsPageNames } from '../constants/lessonsConstants';
  import TopNav from './TopNav';
  import ClassListPage from './ClassListPage';
  import ExamsPage from './exams/CoachExamsPage';
  import CreateExamPage from './exams/CreateExamPage';
  import ExamReportPage from './exams/ExamReportPage';
  import ExamReportDetailPage from './exams/CoachExamReport';
  import GroupsPage from './GroupsPage';
  import LearnerExerciseDetailPage from './reports/LearnerExerciseDetailPage';
  import RecentItemsPage from './reports/RecentItemsPage';
  import ChannelListPage from './reports/ChannelListPage';
  import ItemListPage from './reports/ItemListPage';
  import LearnerListPage from './reports/LearnerListPage';
  import NavTitle from './NavTitle';
  import LessonsRootPage from './lessons/LessonsRootPage';
  import LessonSummaryPage from './lessons/LessonSummaryPage';
  import LessonResourceSelectionPage from './lessons/LessonResourceSelectionPage';
  import LessonContentPreviewPage from './lessons/LessonContentPreviewPage';
  import LessonResourceUserReportPage from './reports/LearnerExerciseDetailPage/LearnerExerciseReport';
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
    [PageNames.CLASS_LIST]: ClassListPage,
    [PageNames.EXAMS]: ExamsPage,
    [PageNames.GROUPS]: GroupsPage,
    [PageNames.CREATE_EXAM]: CreateExamPage,
    // reports
    [PageNames.RECENT_CHANNELS]: ChannelListPage,
    [PageNames.RECENT_ITEMS_FOR_CHANNEL]: RecentItemsPage,
    [PageNames.RECENT_LEARNERS_FOR_ITEM]: LearnerListPage,
    [PageNames.RECENT_LEARNER_ITEM_DETAILS]: LearnerExerciseDetailPage,
    [PageNames.TOPIC_CHANNELS]: ChannelListPage,
    [PageNames.TOPIC_CHANNEL_ROOT]: ItemListPage,
    [PageNames.TOPIC_ITEM_LIST]: ItemListPage,
    [PageNames.TOPIC_LEARNERS_FOR_ITEM]: LearnerListPage,
    [PageNames.TOPIC_LEARNER_ITEM_DETAILS]: LearnerExerciseDetailPage,
    [PageNames.LEARNER_LIST]: LearnerListPage,
    [PageNames.LEARNER_CHANNELS]: ChannelListPage,
    [PageNames.LEARNER_CHANNEL_ROOT]: ItemListPage,
    [PageNames.LEARNER_ITEM_LIST]: ItemListPage,
    [PageNames.LEARNER_ITEM_DETAILS]: LearnerExerciseDetailPage,
    [PageNames.EXAM_REPORT]: ExamReportPage,
    [PageNames.EXAM_REPORT_DETAIL]: ExamReportDetailPage,
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
    name: 'CoachIndex',
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
      TopNav,
      CoreBase,
      NavTitle,
    },
    computed: {
      ...mapGetters(['classCoaches', 'isAdmin', 'isCoach', 'isSuperuser']),
      ...mapState(['pageName', 'classList', 'className', 'classId', 'toolbarRoute']),
      topLevelPageName: () => TopLevelPageNames.COACH,
      currentPage() {
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
