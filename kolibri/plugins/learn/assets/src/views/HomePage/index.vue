<template>

  <div>
    <YourClasses
      v-if="isUserLoggedIn"
      class="section"
      :classes="classes"
      data-test="classes"
      short
    />
    <ContinueLearning
      v-if="continueLearningFromClasses || continueLearningOnYourOwn"
      class="section"
      :fromClasses="continueLearningFromClasses"
      data-test="continueLearning"
    />
    <AssignedLessonsCards
      v-if="hasActiveClassesLessons"
      class="section"
      :lessons="activeClassesLessons"
      displayClassName
      recent
    />
    <AssignedQuizzesCards
      v-if="hasActiveClassesQuizzes"
      class="section"
      :quizzes="activeClassesQuizzes"
      displayClassName
      recent
    />
  </div>

</template>


<script>

  import { computed, onBeforeMount } from 'kolibri.lib.vueCompositionApi';
  import { get } from '@vueuse/core';
  import useDeviceSettings from '../../composables/useDeviceSettings';
  import useLearnerResources from '../../composables/useLearnerResources';
  import useUser from '../../composables/useUser';
  import AssignedLessonsCards from '../classes/AssignedLessonsCards';
  import AssignedQuizzesCards from '../classes/AssignedQuizzesCards';
  import YourClasses from '../YourClasses';
  import ContinueLearning from './ContinueLearning';

  /**
   * Home page contains useful suggestions for a learner, e.g. their
   * resources and quizzes in progress, classes, resources to explore, etc.
   * What sections are displayed depends on whether a learner
   * is signed in and also if they're a member of classes.
   */
  export default {
    name: 'HomePage',
    components: {
      AssignedLessonsCards,
      AssignedQuizzesCards,
      YourClasses,
      ContinueLearning,
    },
    setup() {
      const { isUserLoggedIn } = useUser();
      const { canAccessUnassignedContent } = useDeviceSettings();
      const {
        classes,
        activeClassesLessons,
        activeClassesQuizzes,
        resumableClassesQuizzes,
        resumableClassesResources,
        resumableNonClassesContentNodes,
        fetchClasses,
        fetchResumableContentNodes,
      } = useLearnerResources();

      const canResumeClasses = computed(() => {
        return get(resumableClassesQuizzes).length > 0 || get(resumableClassesResources).length > 0;
      });
      const continueLearningFromClasses = computed(
        () => get(isUserLoggedIn) && get(canResumeClasses)
      );
      const continueLearningOnYourOwn = computed(
        () =>
          get(isUserLoggedIn) &&
          get(canAccessUnassignedContent) &&
          !get(canResumeClasses) &&
          get(resumableNonClassesContentNodes).length > 0
      );
      const hasActiveClassesLessons = computed(
        () =>
          get(isUserLoggedIn) && get(activeClassesLessons) && get(activeClassesLessons).length > 0
      );
      const hasActiveClassesQuizzes = computed(
        () =>
          get(isUserLoggedIn) && get(activeClassesQuizzes) && get(activeClassesQuizzes).length > 0
      );

      onBeforeMount(() => {
        if (get(isUserLoggedIn)) {
          fetchClasses();
          fetchResumableContentNodes();
        }
      });

      return {
        isUserLoggedIn,
        classes,
        activeClassesLessons,
        activeClassesQuizzes,
        hasActiveClassesLessons,
        hasActiveClassesQuizzes,
        continueLearningFromClasses,
        continueLearningOnYourOwn,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .section:not(:first-child) {
    margin-top: 42px;
  }

</style>
