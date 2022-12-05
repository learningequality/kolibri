<template>

  <CoachImmersivePage
    :appBarTitle="exercise.title"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
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
    name: 'ReportsGroupReportLessonExerciseQuestionPage',
    components: {
      CoachImmersivePage,
      QuestionLearnersReport,
    },
    mixins: [commonCoach],
    computed: {
      ...mapState('questionDetail', ['title']),
      ...mapState('exerciseDetail', ['exercise']),
      toolbarRoute() {
        const backRoute = this.backRouteForQuery(this.$route.query);
        return backRoute || this.classRoute('ReportsGroupReportLessonExerciseQuestionListPage', {});
      },
    },
    methods: {
      handleNavigation(params) {
        this.$router.push({
          name: this.name,
          params: {
            classId: this.$route.params.classId,
            groupId: this.$route.params.groupId,
            lessonId: this.$route.params.lessonId,
            ...params,
          },
        });
      },
    },
  };

</script>


<style lang="scss" scoped></style>
