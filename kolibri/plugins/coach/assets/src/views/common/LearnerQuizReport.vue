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
      :closed="closed"
      :navigateToQuestion="navigateToQuestion"
      :navigateToQuestionAttempt="navigateToQuestionAttempt"
      :questions="questions"
      :exerciseContentNodes="exerciseContentNodes"
    />
    <div v-else class="no-exercise-x">
      <mat-svg category="navigation" name="close" />
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
        closed: state => state.examLog.closed,
        completionTimestamp: state => state.examLog.completion_timestamp,
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
    $trs: {},
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
