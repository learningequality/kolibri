<template>

  <CoachImmersivePage
    :appBarTitle="exam.title"
    icon="back"
    :primary="false"
    :route="toolbarRoute"
  >
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
  </CoachImmersivePage>

</template>


<script>

  import { mapState } from 'vuex';
  import ExamReport from 'kolibri-common/components/quizzes/QuizReport';
  import commonCoach from '../../common';
  import CoachImmersivePage from '../../CoachImmersivePage';
  import { PageNames } from '../../../constants';

  export default {
    name: 'LearnerQuizPage',
    components: {
      ExamReport,
      CoachImmersivePage,
    },
    mixins: [commonCoach],
    data() {
      return {
        prevRoute: null,
      };
    },
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
        return this.learnerMap[this.learnerId] || {};
      },
      toolbarRoute() {
        return this.prevRoute || this.classRoute(PageNames.EXAM_SUMMARY);
      },
    },
    beforeRouteEnter(to, from, next) {
      next(vm => {
        vm.prevRoute = from;
      });
    },
    methods: {
      navigateTo(tryIndex, questionId, interactionIndex) {
        this.$router.push({
          name: PageNames.QUIZ_LEARNER_REPORT,
          params: {
            classId: this.$route.params.classId,
            groupId: this.$route.params.groupId,
            examId: this.exam.id,
            learnerId: this.learnerId,
            interactionIndex,
            questionId,
            tryIndex,
          },
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
