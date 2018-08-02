<template>

  <div v-if="examAttempts">
    <ExamReport
      :examAttempts="examAttempts"
      :exam="exam"
      :userName="userName"
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
    />
  </div>
  <div v-else>
    <div class="no-exercise-x">
      <mat-svg category="navigation" name="close" />
    </div>
  </div>

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
      ...mapState({
        classId: state => state.pageState.exam.collection,
        examAttempts: state => state.pageState.examAttempts,
        exam: state => state.pageState.exam,
        userName: state => state.pageState.user.full_name,
        userId: state => state.pageState.user.id,
        currentAttempt: state => state.pageState.currentAttempt,
        currentInteractionHistory: state => state.pageState.currentInteractionHistory,
        currentInteraction: state => state.pageState.currentInteraction,
        selectedInteractionIndex: state => state.pageState.interactionIndex,
        questionNumber: state => state.pageState.questionNumber,
        exercise: state => state.pageState.exercise,
        itemId: state => state.pageState.itemId,
        completionTimestamp: state => state.pageState.examLog.completion_timestamp,
        closed: state => state.pageState.examLog.closed,
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
      documentTitle: '{ examTitle } report',
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
