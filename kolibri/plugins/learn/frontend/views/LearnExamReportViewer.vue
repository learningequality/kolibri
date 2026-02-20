<template>

  <ImmersivePage
    :route="homePageLink"
    :appBarTitle="reportVisible ? exam.title : ''"
  >
    <KPageContainer
      v-if="reportVisible"
      :topMargin="50"
      class="container"
    >
      <KCircularLoader v-if="loading" />
      <div v-else-if="exerciseContentNodes && exerciseContentNodes.length">
        <ExamReport
          :contentId="exam.id"
          :title="exam.title"
          :userName="userName"
          :userId="userId"
          :selectedInteractionIndex="selectedInteractionIndex"
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

  import { mapState } from 'vuex';
  import ExamReport from 'kolibri-common/components/quizzes/QuizReport';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import useUser from 'kolibri/composables/useUser';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { PageNames, ClassesPageNames } from '../constants';
  import useLearnerResources from '../composables/useLearnerResources';

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
      const { full_name, currentUserId } = useUser();
      const { activeClassesQuizzes } = useLearnerResources();
      return { userName: full_name, userId: currentUserId, activeClassesQuizzes };
    },
    computed: {
      ...mapState('examReportViewer', [
        'exam',
        'exercise',
        'exerciseContentNodes',
        'questionNumber',
        'questions',
        'tryIndex',
      ]),
      ...mapState('examReportViewer', {
        classId: state => state.exam.collection,
        selectedInteractionIndex: state => state.interactionIndex,
      }),
      ...mapState({
        loading: state => state.core.loading,
      }),
      homePageLink() {
        return {
          name: PageNames.HOME,
        };
      },
      reportVisible() {
        const quiz = this.activeClassesQuizzes.find(q => q.id === this.exam.id) || this.exam;
        // Show report if instant_report_visibility is true or null, or if quiz is closed
        return quiz.instant_report_visibility !== false || quiz.archive;
      },
      showQuizReportComingSoonModal() {
        return !this.reportVisible && !this.loading;
      },
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
        this.$router.replace({
          name: ClassesPageNames.CLASS_ASSIGNMENTS,
          params: { classId: this.classId },
        });
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
