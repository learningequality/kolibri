<template>

  <ImmersivePage
    :route="homePageLink"
    :appBarTitle="isReportVisible ? exam.title : ''"
  >
    <KPageContainer
      v-if="isReportVisible"
      :topMargin="50"
      class="container"
    >
      <KCircularLoader v-if="isLoading" />
      <div v-else-if="exerciseContentNodes && exerciseContentNodes.length">
        <ExamReport
          :contentId="exam.id"
          :title="exam.title"
          :userName="userName"
          :userId="userId"
          :selectedInteractionIndex="interactionIndex"
          :questionNumber="questionNumber"
          :tryIndex="tryIndex"
          :exercise="exercise"
          :exerciseContentNodes="exerciseContentNodes"
          :navigateTo="navigateTo"
          :questions="questions"
          :sections="exam.question_sources"
          @noCompleteTries="noCompleteTries"
        />
      </div>
      <div v-else>
        <p class="no-exercise">
          {{ $tr('missingContent') }}
        </p>
      </div>
    </KPageContainer>
    <div v-else-if="error">
      <KModal
        :title="$tr('errorOccurred')"
        :submitText="coreString('closeAction')"
        @submit="openHomePage()"
      >
        <div>
          {{ $tr('errorDetails') }}
        </div>
      </KModal>
    </div>
    <div v-else-if="showQuizReportComingSoonModal">
      <KModal
        :title="$tr('quizReportComingSoon')"
        :submitText="coreString('closeAction')"
        @submit="openHomePage()"
      >
        <div>
          {{ $tr('quizReportComingSoonDetails') }}
        </div>
      </KModal>
    </div>
  </ImmersivePage>

</template>


<script>

  import ExamReport from 'kolibri-common/components/quizzes/QuizReport';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import useUser from 'kolibri/composables/useUser';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { PageNames, ClassesPageNames } from '../constants';
  import { useExamReport } from '../composables/useExamReport';

  export default {
    name: 'LearnExamReportViewer',
    metaInfo() {
      return {
        title: this.$tr('documentTitle', { examTitle: this.exam.title }),
      };
    },
    components: {
      ExamReport,
      ImmersivePage,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { full_name, user_id } = useUser();
      const {
        error,
        exam,
        exercise,
        exerciseContentNodes,
        questionNumber,
        questions,
        tryIndex,
        interactionIndex,
        classId,
        isLoading,
        isReportVisible,
        homePageLink,
        showQuizReportComingSoonModal,
        handleNoCompleteTries,
        showExamReport,
      } = useExamReport();
      console.log('error', error);
      // Initialize the exam report data based on route params
      const initExamReport = route => {
        const { classId, examId, tryIndex, questionNumber, questionInteraction } = route.params;
        showExamReport({
          classId,
          examId,
          tryIndex,
          questionNumber,
          questionInteraction,
        });
      };

      return {
        error,
        userName: full_name,
        userId: user_id,
        exam,
        exercise,
        exerciseContentNodes,
        questionNumber,
        questions,
        tryIndex,
        interactionIndex,
        classId,
        isLoading,
        isReportVisible,
        homePageLink,
        showQuizReportComingSoonModal,
        handleNoCompleteTries,
        initExamReport,
      };
    },
    watch: {
      // Watch for route changes to handle navigation between questions
      $route(to, from) {
        // Only reload if relevant parameters have changed
        if (
          to.params.examId !== from.params.examId ||
          to.params.tryIndex !== from.params.tryIndex ||
          to.params.questionNumber !== from.params.questionNumber ||
          to.params.questionInteraction !== from.params.questionInteraction
        ) {
          this.initExamReport(to);
        }
      },
    },
    created() {
      this.initExamReport(this.$route);
    },
    mounted() {
      // Ensure we have the correct data loaded when the component is mounted
      this.initExamReport(this.$route);
    },
    methods: {
      navigateTo(tryIndex, questionNumber, interaction) {
        this.$router.push({
          name: ClassesPageNames.EXAM_REPORT_VIEWER,
          params: {
            classId: this.classId,
            questionInteraction: interaction,
            questionNumber,
            tryIndex,
            examId: this.exam.id,
          },
        });
      },
      noCompleteTries() {
        this.handleNoCompleteTries();
      },
      openHomePage() {
        this.$router.push({
          name: PageNames.HOME,
        });
      },
    },
    $trs: {
      documentTitle: {
        message: 'Report for { examTitle }',
        context:
          "Title indicating for a learner's report page that also indicates the name of the quiz.",
      },
      missingContent: {
        message: 'This quiz cannot be displayed because some resources were deleted',
        context:
          'Error message a user sees if there was a problem accessing a quiz report page. This is because the resource has been removed.',
      },
      quizReportComingSoon: {
        message: 'Quiz report coming soon',
        context: 'Message displayed when a quiz report is not yet available.',
      },
      quizReportComingSoonDetails: {
        message: 'You can see your quiz report when your coach ends the quiz',
        context: 'Details message displayed when a quiz report is not yet available.',
      },
      errorOccurred: {
        message: 'An error occurred',
        context: 'Title for the error modal.',
      },
      errorDetails: {
        message: 'An error occurred while loading the quiz report. Please try again later.',
        context: 'Details message for the error modal.',
      },
    },
  };

</script>
<style lang="scss" scoped>

  .no-exercise {
    text-align: center;
  }

  .container {
    max-width: 1000px;
    margin: auto;
  }

</style>
