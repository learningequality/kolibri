<template>

  <CoreBase
    :immersivePage="true"
    :immersivePagePrimary="true"
    immersivePageIcon="arrow_back"
    :immersivePageRoute="toolbarRoute"
    :appBarTitle="exercise.title"
    :pageTitle="title"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
  >
    <QuestionLearnersReport
      @navigate="handleNavigation"
    />
  </CoreBase>

</template>


<script>

  import { mapState } from 'vuex';
  import commonCoach from '../common';
  import QuestionLearnersReport from '../common/QuestionLearnersReport';

  export default {
    name: 'ReportsGroupReportLessonExerciseQuestionPage',
    components: {
      QuestionLearnersReport,
    },
    mixins: [commonCoach],
    computed: {
      ...mapState('questionDetail', ['title']),
      ...mapState('exerciseDetail', ['exercise']),
      toolbarRoute() {
        return this.classRoute('ReportsGroupReportLessonExerciseQuestionListPage', {});
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
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
