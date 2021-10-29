<template>

  <KPageContainer noPadding>
    <ExamReport
      v-if="examAttempts"
      :examAttempts="examAttempts"
      :exam="exam"
      :userName="learner.name"
      :currentAttempt="currentAttempt"
      :currentInteractionHistory="currentInteractionHistory"
      :currentInteraction="currentInteraction"
      :selectedInteractionIndex="selectedInteractionIndex"
      :questionNumber="questionNumber"
      :exercise="exercise"
      :itemId="itemId"
      :completionTimestamp="completionTimestamp"
      :complete="complete"
      :navigateToQuestion="navigateToQuestion"
      :navigateToQuestionAttempt="navigateToQuestionAttempt"
      :questions="questions"
      :exerciseContentNodes="exerciseContentNodes"
    />
    <div v-else>
      {{ $tr('noAttemptsInExam') }}
    </div>
  </KPageContainer>

</template>


<script>

  import { mapState } from 'vuex';
  import ExamReport from 'kolibri.coreVue.components.ExamReport';
  import commonCoach from '../common';

  export default {
    name: 'LearnerQuizReport',
    components: {
      ExamReport,
    },
    mixins: [commonCoach],
    computed: {
      ...mapState('classSummary', ['learnerMap']),
      ...mapState('examReportDetail', [
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
        'learnerId',
      ]),
      ...mapState('examReportDetail', {
        complete: state => state.masteryLog.complete,
        completionTimestamp: state => state.masteryLog.completion_timestamp,
        selectedInteractionIndex: state => state.interactionIndex,
      }),
      learner() {
        return this.learnerMap[this.learnerId];
      },
    },
    methods: {
      navigateToQuestion(questionNumber) {
        this.$emit('navigate', {
          examId: this.exam.id,
          learnerId: this.learnerId,
          interactionIndex: 0,
          questionId: questionNumber,
        });
      },
      navigateToQuestionAttempt(interactionIndex) {
        this.$emit('navigate', {
          examId: this.exam.id,
          learnerId: this.learnerId,
          interactionIndex,
          questionId: this.questionNumber,
        });
      },
    },
    $trs: {
      noAttemptsInExam: {
        message: 'This quiz has not been started yet',
        context:
          'This message will display if the learner has not made any attempt to answer a quiz question.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .no-exercise-x {
    text-align: center;
    svg {
      width: 200px;
      height: 200px;
    }
  }

</style>
