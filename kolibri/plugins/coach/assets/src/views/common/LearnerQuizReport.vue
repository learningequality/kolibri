<template>

  <KPageContainer :topMargin="0">
    <ExamReport
      :contentId="exam.id"
      :title="exam.title"
      :userName="learner.name"
      :userId="learner.id"
      :selectedInteractionIndex="interactionIndex"
      :questionNumber="questionNumber"
      :tryIndex="tryIndex"
      :exercise="exercise"
      :exerciseContentNodes="exerciseContentNodes"
      :navigateTo="navigateTo"
      :questions="questions"
      :sections="exam.question_sources"
    />
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
        'exam',
        'exercise',
        'exerciseContentNodes',
        'questionNumber',
        'interactionIndex',
        'tryIndex',
        'questions',
        'learnerId',
      ]),
      learner() {
        return this.learnerMap[this.learnerId];
      },
    },
    methods: {
      navigateTo(tryIndex, questionId, interactionIndex) {
        this.$emit('navigate', {
          examId: this.exam.id,
          learnerId: this.learnerId,
          interactionIndex,
          questionId,
          tryIndex,
        });
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
