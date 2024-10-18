<template>

  <KPageContainer :topMargin="0">
    <MissingResourceAlert
      v-if="!exercise.available"
      :multiple="false"
    />
    <ExamReport
      :contentId="exercise.content_id"
      :title="exercise.title"
      :userName="learner.name"
      :userId="learner.id"
      :selectedInteractionIndex="interactionIndex"
      :questionNumber="questionId"
      :tryIndex="tryIndex"
      :exercise="exercise"
      :exerciseContentNodes="[exercise]"
      :navigateTo="navigateTo"
      :questions="questions"
      :isQuiz="isQuiz"
      :isSurvey="isSurvey"
    />
  </KPageContainer>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import MissingResourceAlert from 'kolibri-common/components/MissingResourceAlert';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import ExamReport from 'kolibri-common/components/quizzes/QuizReport';
  import commonCoach from '../common';

  export default {
    name: 'LearnerExerciseReport',
    components: {
      MissingResourceAlert,
      ExamReport,
    },
    mixins: [commonCoach, commonCoreStrings],
    computed: {
      ...mapGetters('exerciseDetail', ['isQuiz', 'isSurvey']),
      ...mapState('classSummary', ['learnerMap']),
      ...mapState('exerciseDetail', [
        'questionId',
        'exercise',
        'tryIndex',
        'interactionIndex',
        'learnerId',
      ]),
      learner() {
        return this.learnerMap[this.learnerId];
      },
      questions() {
        return this.exercise
          ? this.exercise.assessmentmetadata.assessment_item_ids.map((id, index) => ({
            item: id,
            question_id: id,
            exercise_id: this.exercise.id,
            counter_in_exercise: index,
            title: this.exercise.title,
          }))
          : [];
      },
    },
    methods: {
      navigateTo(tryIndex, questionId, interactionIndex) {
        this.$emit('navigate', {
          exerciseId: this.exercise.content_id,
          learnerId: this.learnerId,
          interactionIndex,
          questionId,
          tryIndex,
        });
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped>

  .exercise-section {
    padding: 16px;
  }

  .exercise-detail-section {
    display: inline-block;
    margin-top: 0;
  }

  .exercise-detail-icons {
    position: relative;
    top: -2px;
  }

</style>
