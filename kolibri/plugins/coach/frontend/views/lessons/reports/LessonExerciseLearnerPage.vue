<template>

  <CoachImmersivePage
    :loading="pageLoading"
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
  import { useRoute } from 'vue-router/composables';
  import usePageTitle from 'kolibri/composables/usePageTitle';
  import { pageLoading } from 'kolibri-common/composables/usePageLoading';
  import commonCoach from '../../common';
  import CoachImmersivePage from '../../CoachImmersivePage';
  import LearnerExerciseReport from '../../common/LearnerExerciseReport';
  import { PageNames } from '../../../constants';
  import store from '../../../store';

  export default {
    name: 'LessonExerciseLearnerPage',
    components: {
      CoachImmersivePage,
      LearnerExerciseReport,
    },
    mixins: [commonCoach],
    setup() {
      const route = useRoute();
      usePageTitle(
        () => {
          const { contentMap, learnerMap, lessonMap, name } = store.state.classSummary;
          const { exerciseId, learnerId, lessonId } = route.params;
          return [
            learnerMap[learnerId]?.name,
            contentMap[exerciseId]?.title,
            lessonMap[lessonId]?.title,
            name,
          ];
        },
        { hasVisibleHeading: true },
      );
      return { pageLoading };
    },
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
