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
      :showSubNav="Boolean(classId) && showCoachNav && !currentPageIsImmersive"
      :marginBottom="marginBottom"
    >

      <!-- COACH - under construction ... -->
      <NewCoachTopNav v-if="isNewPage" slot="sub-nav" />
      <CoachTopNav v-else slot="sub-nav" />

      <div v-if="isNewPage" class="coach-debug">
        <pre>{{ $route.params.page }}</pre>
        <p class="coach-warning">
          PROTOTYPE: not the final design or functionality
        </p>
      </div>
      <!-- ... COACH - under construction -->

      <template v-if="showCoachNav && !isNewPage">
        <NavTitle
          class="nav-title"
          :className="className"
          :classCoaches="classCoaches"
        />
      </template>
      <LessonContentPreviewPage
        v-if="isPreviewPage"
        :currentContentNode="currentContentNode"
        :isSelected="isSelected"
        :questions="questions"
        :displaySelectOptions="displaySelectOptions"
        :completionData="completionData"
        @addResource="handleAddResource"
        @removeResource="handleRemoveResource"
      />
      <component
        :is="currentPage"
        v-else
      />
      <router-view />

    </CoreBase>
  </div>

</template>


<script>

  import { mapState, mapGetters, mapActions } from 'vuex';
  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import logger from 'kolibri.lib.logging';
  import { PageNames } from '../constants';
  import { LessonsPageNames } from '../constants/lessonsConstants';
  import CoachTopNav from './CoachTopNav';
  import NewCoachTopNav from './new/TopNavbar';
  import ClassListPage from './ClassListPage';
  import ExamsPage from './exams/CoachExamsPage';
  import ExamCreationPage from './exams/CreateExamPage';
  import CreateExamPreview from './exams/CreateExamPage/CreateExamPreview';
  import ExamReportPage from './exams/ExamReportPage';
  import ExamReportDetailPage from './exams/CoachExamReport';
  import GroupsPage from './GroupsPage';
  import LearnerExerciseDetailPage from './reports/LearnerExerciseDetailPage';
  import RecentItemsForChannelPage from './reports/RecentItemsForChannelPage';
  import ChannelListPage from './reports/ChannelListPage';
  import ItemListPage from './reports/ItemListPage';
  import LearnerListPage from './reports/LearnerListPage';
  import NavTitle from './NavTitle';
  import LessonsRootPage from './lessons/LessonsRootPage';
  import LessonSummaryPage from './lessons/LessonSummaryPage';
  import LessonContentPreviewPage from './lessons/LessonContentPreviewPage';
  import LessonResourceUserReportPage from './reports/LearnerExerciseDetailPage/LearnerExerciseReportOld';
  import LessonResourceUserSummaryPage from './lessons/LessonResourceUserSummaryPage';

  /* COACH - under construction ... */
  import { newPageMap, newImmersivePages } from './new/newPages';
  /* ... COACH - under construction */

  const logging = logger.getLogger(__filename);

  // IDEA set up routenames that all use the same PageName instead of doing this?
  // See Content Preview routes in app.js + PageName handling here
  const selectionPages = [
    LessonsPageNames.SELECTION,
    LessonsPageNames.SELECTION_ROOT,
    LessonsPageNames.SELECTION_SEARCH,
  ];
  const resourceUserPages = [
    LessonsPageNames.RESOURCE_USER_SUMMARY,
    LessonsPageNames.RESOURCE_USER_REPORT,
  ];

  const examCreationPages = [
    PageNames.EXAM_REPORT_DETAIL,
    PageNames.EXAM_CREATION_ROOT,
    PageNames.EXAM_CREATION_TOPIC,
    PageNames.EXAM_CREATION_PREVIEW,
    PageNames.EXAM_CREATION_SEARCH,
    PageNames.EXAM_CREATION_QUESTION_SELECTION,
  ];

  const immersivePages = [
    ...selectionPages,
    ...resourceUserPages,
    LessonsPageNames.CONTENT_PREVIEW,
    LessonsPageNames.RESOURCE_CONTENT_PREVIEW,
    LessonsPageNames.SELECTION_CONTENT_PREVIEW,
    LessonsPageNames.RESOURCE_CLASSROOM_REPORT,
    PageNames.EXAM_REPORT_DETAIL,
    PageNames.EXAM_CREATION_ROOT,
    PageNames.EXAM_CREATION_TOPIC,
    PageNames.EXAM_CREATION_PREVIEW,
    PageNames.EXAM_CREATION_SEARCH,
    PageNames.EXAM_CREATION_QUESTION_SELECTION,
  ];

  const pageNameToComponentMap = {
    [PageNames.CLASS_LIST]: ClassListPage,
    [PageNames.EXAMS]: ExamsPage,
    [PageNames.GROUPS]: GroupsPage,

    [PageNames.EXAM_CREATION_ROOT]: ExamCreationPage,
    [PageNames.EXAM_CREATION_TOPIC]: ExamCreationPage,
    [PageNames.EXAM_CREATION_PREVIEW]: LessonContentPreviewPage,
    [PageNames.EXAM_CREATION_SEARCH]: ExamCreationPage,
    [PageNames.EXAM_CREATION_QUESTION_SELECTION]: CreateExamPreview,

    // reports
    [PageNames.RECENT_CHANNELS]: ChannelListPage,
    [PageNames.RECENT_ITEMS_FOR_CHANNEL]: RecentItemsForChannelPage,
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
    [LessonsPageNames.CONTENT_PREVIEW]: LessonContentPreviewPage,
    [LessonsPageNames.RESOURCE_CONTENT_PREVIEW]: LessonContentPreviewPage,
    [LessonsPageNames.SELECTION_CONTENT_PREVIEW]: LessonContentPreviewPage,
    [LessonsPageNames.RESOURCE_USER_SUMMARY]: LessonResourceUserSummaryPage,
    [LessonsPageNames.RESOURCE_USER_REPORT]: LessonResourceUserReportPage,
  };

  export default {
    name: 'CoachIndex',
    $trs: {
      coachToolbarHeader: 'Coach',
      selectPageToolbarHeader: 'Manage resources',
      resourceUserPageToolbarHeader: 'Lesson Report Details',
      previewContentPageToolbarHeader: 'Preview resources',
      noAssignmentErrorHeader: "You aren't assigned to any classes",
      noAssignmentErrorSubheader:
        'To start coaching a class, please consult your Kolibri administrator',
      createNewExam: 'Create new quiz',
      resourcesAddedSnackbarText:
        'Added {count, number, integer} {count, plural, one {resource} other {resources}} to lesson',
      resourcesRemovedSnackbarText:
        'Removed {count, number, integer} {count, plural, one {resource} other {resources}} from lesson',
      added: "Added '{item}'",
      removed: "Removed '{item}'",
      reportLessonDetailEditorTitle: 'Edit lesson details',
      reportLessonResourceManagerTitle: 'Manage resources',
    },
    components: {
      CoachTopNav,
      NewCoachTopNav,
      CoreBase,
      NavTitle,
      LessonContentPreviewPage,
    },
    computed: {
      ...mapGetters(['classCoaches', 'isAdmin', 'isCoach', 'isSuperuser']),
      ...mapState(['pageName', 'classList', 'className', 'classId', 'toolbarRoute']),
      ...mapState('lessonSummary', {
        lessonWorkingResources: state => state.workingResources,
      }),
      ...mapState('lessonSummary/resources', {
        lessonCurrentContentNode: state => state.currentContentNode,
        lessonPreviewQuestions: state => state.preview.questions,
        lessonPreviewCompletionData: state => state.preview.completionData,
      }),
      ...mapState('examCreation', {
        examSelectedExercises: state => state.selectedExercises,
        examCurrentContentNode: state => state.currentContentNode,
        examPreviewQuestions: state => state.preview.questions,
        examPreviewCompletionData: state => state.preview.completionData,
      }),

      currentPage() {
        /* COACH - under construction ... */
        if (this.isNewPage) {
          if (!newPageMap[this.$route.params.page]) {
            logging.error(`${this.$route.params.page} has not been registered to CoachIndex`);
          }
          return newPageMap[this.$route.params.page];
        }
        /* ... COACH - under construction */
        return pageNameToComponentMap[this.pageName] || null;
      },
      isPreviewPage() {
        return [
          PageNames.EXAM_CREATION_PREVIEW,
          LessonsPageNames.CONTENT_PREVIEW,
          LessonsPageNames.RESOURCE_CONTENT_PREVIEW,
          LessonsPageNames.SELECTION_CONTENT_PREVIEW,
        ].includes(this.pageName);
      },
      workingResources() {
        if (this.pageName === PageNames.EXAM_CREATION_PREVIEW) {
          return this.examSelectedExercises;
        } else {
          return this.lessonWorkingResources;
        }
      },
      currentContentNode() {
        if (this.pageName === PageNames.EXAM_CREATION_PREVIEW) {
          return this.examCurrentContentNode;
        } else {
          return this.lessonCurrentContentNode;
        }
      },
      isSelected() {
        if (this.pageName === PageNames.EXAM_CREATION_PREVIEW) {
          return (
            this.examSelectedExercises.findIndex(
              exercise => exercise.id === this.examCurrentContentNode.id
            ) !== -1
          );
        } else {
          if (
            this.lessonWorkingResources &&
            this.lessonCurrentContentNode &&
            this.lessonCurrentContentNode.id
          ) {
            return this.lessonWorkingResources.includes(this.lessonCurrentContentNode.id);
          }
          return false;
        }
      },
      questions() {
        if (this.pageName === PageNames.EXAM_CREATION_PREVIEW) {
          return this.examPreviewQuestions;
        } else {
          return this.lessonPreviewQuestions;
        }
      },
      completionData() {
        if (this.pageName === PageNames.EXAM_CREATION_PREVIEW) {
          return this.examPreviewCompletionData;
        } else {
          return this.lessonPreviewCompletionData;
        }
      },
      displaySelectOptions() {
        return (
          this.pageName === PageNames.EXAM_CREATION_PREVIEW || Boolean(this.lessonWorkingResources)
        );
      },
      /* COACH - under construction ... */
      isNewPage() {
        return this.pageName === PageNames.NEW_COACH_PAGES;
      },
      showCoachNav() {
        if (this.isNewPage) {
          return this.$route.params.page !== 'CoachClassListPage';
        }
        /* ... COACH - under construction */
        return (
          this.pageName !== PageNames.CLASS_LIST &&
          this.userCanAccessPage &&
          !this.currentPageIsImmersive
        );
      },
      currentPageIsImmersive() {
        /* COACH - under construction ... */
        if (this.isNewPage) {
          return newImmersivePages.includes(this.$route.params.page);
        }
        /* ... COACH - under construction */
        return immersivePages.includes(this.pageName);
      },
      userCanAccessPage() {
        return this.isCoach || this.isAdmin || this.isSuperuser;
      },
      appBarTitle() {
        /* COACH - under construction ... */
        if (this.isNewPage) {
          if (this.$route.params.page === 'ReportsLessonEditorPage') {
            return this.$tr('reportLessonDetailEditorTitle');
          } else if (this.$route.params.page === 'ReportsLessonManagerPage') {
            return this.$tr('reportLessonResourceManagerTitle');
          }
        }
        /* ... COACH - under construction */
        if (this.currentPageIsImmersive) {
          if (
            [LessonsPageNames.CONTENT_PREVIEW, PageNames.EXAM_CREATION_PREVIEW].includes(
              this.pageName
            )
          ) {
            return this.$tr('previewContentPageToolbarHeader');
          }
          if (selectionPages.includes(this.pageName)) {
            return this.$tr('selectPageToolbarHeader');
          }
          if (resourceUserPages.includes(this.pageName)) {
            return this.$tr('resourceUserPageToolbarHeader');
          }
          if (
            [
              PageNames.EXAM_CREATION_ROOT,
              PageNames.EXAM_CREATION_TOPIC,
              PageNames.EXAM_CREATION_SEARCH,
              PageNames.EXAM_CREATION_QUESTION_SELECTION,
            ].includes(this.pageName)
          ) {
            return this.$tr('createNewExam');
          }
        }
        return this.$tr('coachToolbarHeader');
      },
      immersivePageIcon() {
        const backButtonPages = [
          LessonsPageNames.CONTENT_PREVIEW,
          ...resourceUserPages,
          LessonsPageNames.SELECTION_SEARCH,
          PageNames.EXAM_REPORT_DETAIL,
          PageNames.EXAM_CREATION_PREVIEW,
          PageNames.EXAM_CREATION_QUESTION_SELECTION,
          PageNames.EXAM_CREATION_SEARCH,
        ];
        if (backButtonPages.includes(this.pageName)) {
          return 'arrow_back';
        }
        return 'close';
      },
      immersivePagePrimary() {
        // TODO going to need to set a background color
        if (
          [
            LessonsPageNames.CONTENT_PREVIEW,
            PageNames.EXAM_REPORT_DETAIL,
            PageNames.EXAM_CREATION_PREVIEW,
          ].includes(this.pageName)
        ) {
          return false;
        }
        return true;
      },
      marginBottom() {
        return examCreationPages.includes(this.pageName) ? 72 : 0;
      },
    },
    methods: {
      ...mapActions(['createSnackbar']),
      ...mapActions('lessonSummary', ['addToResourceCache']),
      ...mapActions('examCreation', ['addToSelectedExercises', 'removeFromSelectedExercises']),
      handleAddResource(content) {
        let text;
        if (this.pageName === PageNames.EXAM_CREATION_PREVIEW) {
          this.addToSelectedExercises([content]);
          text = this.$tr('added', { item: content.title });
        } else {
          this.$store.commit('lessonSummary/ADD_TO_WORKING_RESOURCES', content.id);
          this.addToResourceCache({ node: content });
          text = this.$tr('resourcesAddedSnackbarText', { count: 1 });
        }
        this.createSnackbar({ text, autoDismiss: true });
      },
      handleRemoveResource(content) {
        let text;
        if (this.pageName === PageNames.EXAM_CREATION_PREVIEW) {
          this.removeFromSelectedExercises([content]);
          text = this.$tr('removed', { item: content.title });
        } else {
          this.$store.commit('lessonSummary/REMOVE_FROM_WORKING_RESOURCES', content.id);
          text = this.$tr('resourcesRemovedSnackbarText', { count: 1 });
        }
        this.createSnackbar({ text, autoDismiss: true });
      },
    },
  };

</script>


<style lang="scss" scoped>

  .nav-title {
    margin-bottom: 32px;
  }

</style>


<style lang="scss">

  // COACH - under construction ...
  .new-coach-block {
    padding: 8px 24px 24px;
    margin-top: 24px;
    background-color: white;
    border: 1px solid rgb(240, 240, 240);
    border-radius: 4px;
  }

  .new-coach-table {
    width: 100%;
    min-width: 600px;
    thead {
      font-size: smaller;
      border-bottom: 1px solid rgb(223, 223, 223);
    }
    tbody tr:not(:last-child) {
      border-bottom: 1px solid rgb(223, 223, 223);
    }
    td {
      padding: 8px;
    }
  }

  .table-head {
    font-size: smaller;
    border-bottom: 1px solid rgb(223, 223, 223);
  }

  .coach-debug {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 1000;
    height: 100px;
    font-weight: bold;
    text-align: center;
    background-color: white;
    border-top: 1px solid gray;

    .coach-warning {
      color: red;
    }
  }

  .new-coach-tab.router-link-active {
    border-bottom: 3px solid black;
  }
  // ... COACH - under construction

</style>
