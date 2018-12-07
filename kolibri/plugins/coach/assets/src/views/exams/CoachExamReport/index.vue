<template>

  <ExamReport
    v-if="examAttempts"
    :examAttempts="examAttempts"
    :exam="exam"
    :userName="userName"
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

</template>


<script>

  import { mapState } from 'vuex';
  import ExamReport from 'kolibri.coreVue.components.ExamReport';
  import { PageNames } from '../../../constants';

  export default {
    name: 'CoachExamReport',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      ExamReport,
    },
    computed: {
      ...mapState(['classId']),
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
      ]),
      ...mapState('examReportDetail', {
        closed: state => state.examLog.closed,
        completionTimestamp: state => state.examLog.completion_timestamp,
        selectedInteractionIndex: state => state.interactionIndex,
        userId: state => state.user.id,
        userName: state => state.user.full_name,
      }),
      backPageLink() {
        return {
          name: PageNames.EXAM_REPORT,
          params: {
            classId: this.classId,
            examId: this.exam.id,
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
          name: PageNames.EXAM_REPORT_DETAIL,
          params: {
            interaction,
            question,
          },
        });
      },
    },
    $trs: {
      documentTitle: 'Exam Report Detail',
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

