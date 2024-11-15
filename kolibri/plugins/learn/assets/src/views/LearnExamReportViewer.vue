<template>

  <ImmersivePage
    :route="homePageLink"
    :appBarTitle="exam.title || ''"
  >
    <KPageContainer
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
  </ImmersivePage>

</template>


<script>

  import { mapState } from 'vuex';
  import ExamReport from 'kolibri-common/components/quizzes/QuizReport';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import useUser from 'kolibri/composables/useUser';
  import { PageNames, ClassesPageNames } from '../constants';

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
    setup() {
      const { full_name, user_id } = useUser();
      return { userName: full_name, userId: user_id };
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
