<template>

  <CoachImmersivePage
    :appBarTitle="exercise.title"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    icon="back"
    :primary="false"
    :route="toolbarRoute"
  >
    <LearnerExerciseReport @navigate="handleNavigation" />
  </CoachImmersivePage>

</template>


<script>

  import { mapState } from 'vuex';
  import commonCoach from '../common';
  import CoachImmersivePage from '../CoachImmersivePage';
  import LearnerExerciseReport from '../common/LearnerExerciseReport';

  export default {
    name: 'ReportsLessonLearnerExercisePage',
    components: {
      CoachImmersivePage,
      LearnerExerciseReport,
    },
    mixins: [commonCoach],
    computed: {
      ...mapState('exerciseDetail', ['exercise']),
      toolbarRoute() {
        const backRoute = this.backRouteForQuery(this.$route.query);
        return backRoute || this.classRoute('ReportsLessonLearnerPage', {});
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
