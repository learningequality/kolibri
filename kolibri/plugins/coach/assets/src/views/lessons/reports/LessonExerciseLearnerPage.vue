<template>

  <CoachImmersivePage
    :appBarTitle="exercise.title"
    icon="back"
    :primary="false"
    :route="toolbarRoute"
  >
    <LearnerExerciseReport @navigate="handleNavigation" />
  </CoachImmersivePage>

</template>


<script>

  import { mapState } from 'vuex';
  import commonCoach from '../../common';
  import CoachImmersivePage from '../../CoachImmersivePage';
  import LearnerExerciseReport from '../../common/LearnerExerciseReport';
  import { PageNames } from '../../../constants';

  export default {
    name: 'LessonExerciseLearnerPage',
    components: {
      CoachImmersivePage,
      LearnerExerciseReport,
    },
    mixins: [commonCoach],
    data() {
      return {
        prevRoute: null,
      };
    },
    computed: {
      ...mapState('exerciseDetail', ['exercise']),
      toolbarRoute() {
        const backRoute = this.backRouteForQuery(this.$route.query);
        if (backRoute) {
          return backRoute;
        }
        return this.prevRoute || this.classRoute(PageNames.LESSON_EXERCISE_LEARNERS_REPORT, {});
      },
    },
    beforeRouteEnter(to, from, next) {
      next(vm => {
        vm.prevRoute = from;
      });
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
          query: this.$route.query,
        });
      },
    },
  };

</script>


<style lang="scss" scoped></style>
