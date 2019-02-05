<template>

  <CoreBase
    :immersivePage="true"
    :immersivePageRoute="toolbarRoute"
    :appBarTitle="title"
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
    $trs: {
      allQuestionsLabel: 'All questions',
      summary:
        '{count, number, integer} {count, plural, one {learner} other {learners}} got this question incorrect',
    },
  };

</script>


<style lang="scss" scoped></style>
