<template>

  <CoreBase
    :immersivePage="true"
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
    name: 'ReportsLessonExerciseLearnerPage',
    components: {
      LearnerExerciseReport,
    },
    mixins: [commonCoach],
    $trs: {},
    computed: {
      ...mapState('exerciseDetail', ['exercise']),
      toolbarRoute() {
        return this.classRoute('ReportsLessonExerciseLearnerListPage', {});
      },
    },
    methods: {
      handleNavigation(params) {
        this.$router.push({
          name: this.name,
          params: {
            classId: this.$route.params.classId,
            lessonId: this.$route.params.lessonId,
            ...params,
          },
        });
      },
    },
  };

</script>


<style lang="scss" scoped></style>
