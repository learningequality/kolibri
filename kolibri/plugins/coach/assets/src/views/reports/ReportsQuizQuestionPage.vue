<template>

  <CoachImmersivePage
    :appBarTitle="exam ? exam.title : null"
    icon="back"
    :pageTitle="title"
    :primary="false"
    :route="toolbarRoute"
  >
    <QuestionLearnersReport @navigate="handleNavigation" />
  </CoachImmersivePage>

</template>


<script>

  import { mapState } from 'vuex';
  import commonCoach from '../common';
  import CoachImmersivePage from '../CoachImmersivePage';
  import QuestionLearnersReport from '../common/QuestionLearnersReport';

  export default {
    name: 'ReportsQuizQuestionPage',
    components: {
      CoachImmersivePage,
      QuestionLearnersReport,
    },
    mixins: [commonCoach],
    computed: {
      ...mapState('questionDetail', ['title', 'exam']),
      toolbarRoute() {
        const backRoute = this.backRouteForQuery(this.$route.query);
        return backRoute || this.classRoute('ReportsQuizQuestionListPage', {});
      },
    },
    methods: {
      handleNavigation(params) {
        this.$router.push({
          name: this.name,
          params: {
            classId: this.$route.params.classId,
            quizId: this.$route.params.quizId,
            ...params,
          },
        });
      },
    },
  };

</script>


<style lang="scss" scoped></style>
