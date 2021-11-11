<template>

  <KPageContainer noPadding>
    <div v-if="examAttempts">
      <ExamReport
        :examAttempts="examAttempts"
        :exam="exam"
        :userName="userName"
        :userId="userId"
        :currentAttempt="currentAttempt"
        :currentInteractionHistory="currentInteractionHistory"
        :currentInteraction="currentInteraction"
        :selectedInteractionIndex="selectedInteractionIndex"
        :questionNumber="questionNumber"
        :exercise="exercise"
        :itemId="itemId"
        :completionTimestamp="completionTimestamp"
        :complete="complete"
        :backPageLink="backPageLink"
        :navigateToQuestion="navigateToQuestion"
        :navigateToQuestionAttempt="navigateToQuestionAttempt"
        :questions="questions"
        :exerciseContentNodes="exerciseContentNodes"
      />
    </div>
    <div v-else>
      <p class="no-exercise">
        {{ $tr('missingContent') }}
      </p>
    </div>
  </KPageContainer>

</template>


<script>

  import { mapState } from 'vuex';
  import ExamReport from 'kolibri.coreVue.components.ExamReport';
  import { ClassesPageNames } from '../constants';

  export default {
    name: 'LearnExamReportViewer',
    metaInfo() {
      return {
        title: this.$tr('documentTitle', { examTitle: this.exam.title }),
      };
    },
    components: {
      ExamReport,
    },
    computed: {
      ...mapState('examReportViewer', [
        'currentAttempt',
        'currentInteraction',
        'currentInteractionHistory',
        'exam',
        'examAttempts',
        'exercise',
        'exerciseContentNodes',
        'itemId',
        'questionNumber',
        'questions',
      ]),
      ...mapState('examReportViewer', {
        classId: state => state.exam.collection,
        userName: state => state.user.full_name,
        userId: state => state.user.id,
        selectedInteractionIndex: state => state.interactionIndex,
        completionTimestamp: state => state.masteryLog.completion_timestamp,
        complete: state => state.masteryLog.complete,
      }),
      backPageLink() {
        return {
          name: ClassesPageNames.CLASS_ASSIGNMENTS,
          params: {
            classId: this.classId,
          },
        };
      },
    },
    methods: {
      navigateToQuestion(questionNumber) {
        this.navigateTo(questionNumber, 0);
      },
      navigateToQuestionAttempt(interaction) {
        this.navigateTo(this.questionNumber, interaction);
      },
      navigateTo(question, interaction) {
        this.$router.push({
          name: ClassesPageNames.EXAM_REPORT_VIEWER,
          params: {
            classId: this.classId,
            questionInteraction: interaction,
            questionNumber: question,
            examId: this.exam.id,
          },
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

</style>
