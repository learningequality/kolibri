<template>

  <CoreBase
    :immersivePage="true"
    :immersivePagePrimary="true"
    immersivePageIcon="arrow_back"
    :immersivePageRoute="toolbarRoute"
    :appBarTitle="exercise.title"
    :pageTitle="exercise.title"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
  >
    <LearnerExerciseReport
      @navigate="handleNavigation"
    />
  </CoreBase>

</template>


<script>

  import { mapState } from 'vuex';
  import commonCoach from '../common';
  import LearnerExerciseReport from '../common/LearnerExerciseReport';

  export default {
    name: 'ReportsGroupReportLessonExerciseLearnerPage',
    components: {
      LearnerExerciseReport,
    },
    mixins: [commonCoach],
    computed: {
      ...mapState('exerciseDetail', ['exercise']),
      toolbarRoute() {
        return this.classRoute('ReportsGroupReportLessonExerciseLearnerListPage', {});
      },
    },
    methods: {
      handleNavigation(params) {
        this.$router.push({
          name: this.name,
          params: {
            classId: this.$route.params.classId,
            lessonId: this.$route.params.lessonId,
            groupId: this.$route.params.groupId,
            ...params,
          },
        });
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
