<template>

  <LearnAppBarPage :appBarTitle="learnString('learnLabel')">
    <div v-if="!loading" id="main" role="main">
      <MissingResourceAlert v-if="missingResources" />
      <YourClasses
        v-if="displayClasses"
        class="section"
        :classes="classes"
        data-test="classes"
        short
      />
      <ContinueLearning
        v-if="continueLearning"
        class="section"
        :fromClasses="continueLearningFromClasses"
        :data-test="continueLearningFromClasses ?
          'continueLearningFromClasses' :
          'continueLearningOnYourOwn'"
      />
      <AssignedLessonsCards
        v-if="hasActiveClassesLessons"
        class="section"
        :lessons="activeClassesLessons"
        displayClassName
        recent
        data-test="recentLessons"
      />
      <AssignedQuizzesCards
        v-if="hasActiveClassesQuizzes"
        class="section"
        :quizzes="activeClassesQuizzes"
        displayClassName
        recent
        data-test="recentQuizzes"
      />
      <ExploreChannels
        v-if="displayExploreChannels"
        :channels="channels"
        class="section"
        data-test="exploreChannels"
        :short="displayClasses ||
          continueLearning ||
          hasActiveClassesLessons ||
          hasActiveClassesQuizzes
        "
      />

    </div>
  </LearnAppBarPage>

</template>


<script>

  import { computed } from 'kolibri.lib.vueCompositionApi';
  import { get } from '@vueuse/core';
  import MissingResourceAlert from 'kolibri-common/components/MissingResourceAlert';
  import useUser from 'kolibri.coreVue.composables.useUser';
  import useChannels from '../../composables/useChannels';
  import useDeviceSettings from '../../composables/useDeviceSettings';
  import useLearnerResources from '../../composables/useLearnerResources';
  import AssignedLessonsCards from '../classes/AssignedLessonsCards';
  import AssignedQuizzesCards from '../classes/AssignedQuizzesCards';
  import YourClasses from '../YourClasses';
  import LearnAppBarPage from '../LearnAppBarPage';
  import commonLearnStrings from './../commonLearnStrings';
  import ContinueLearning from './ContinueLearning';
  import ExploreChannels from './ExploreChannels';

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
      ExploreChannels,
      LearnAppBarPage,
      MissingResourceAlert,
    },
    mixins: [commonLearnStrings],
    setup() {
      const { isUserLoggedIn } = useUser();
      const { canAccessUnassignedContent } = useDeviceSettings();
      const { channels } = useChannels();
      const {
        classes,
        activeClassesLessons,
        activeClassesQuizzes,
        resumableClassesQuizzes,
        resumableClassesResources,
        resumableContentNodes,
        learnerFinishedAllClasses,
      } = useLearnerResources();

      const continueLearningFromClasses = computed(
        () =>
          (get(isUserLoggedIn) && get(resumableClassesQuizzes).length > 0) ||
          get(resumableClassesResources).length > 0
      );
      const continueLearningOnYourOwn = computed(
        () =>
          get(isUserLoggedIn) &&
          get(learnerFinishedAllClasses) &&
          get(canAccessUnassignedContent) &&
          get(resumableContentNodes).length > 0
      );

      const continueLearning = computed(
        () => get(continueLearningFromClasses) || get(continueLearningOnYourOwn)
      );

      const hasActiveClassesLessons = computed(
        () =>
          get(isUserLoggedIn) && get(activeClassesLessons) && get(activeClassesLessons).length > 0
      );
      const hasActiveClassesQuizzes = computed(
        () =>
          get(isUserLoggedIn) && get(activeClassesQuizzes) && get(activeClassesQuizzes).length > 0
      );
      const hasChannels = computed(() => {
        return get(channels) && get(channels).length > 0;
      });
      const displayExploreChannels = computed(() => {
        return (
          get(hasChannels) &&
          (!get(isUserLoggedIn) ||
            (get(learnerFinishedAllClasses) && get(canAccessUnassignedContent)))
        );
      });

      const displayClasses = computed(() => {
        return get(isUserLoggedIn) && (get(classes).length || !get(canAccessUnassignedContent));
      });

      const missingResources = computed(() => {
        return (
          get(activeClassesLessons).some(l => l.missing_resource) ||
          get(activeClassesQuizzes).some(q => q.missing_resource)
        );
      });

      return {
        isUserLoggedIn,
        channels,
        classes,
        activeClassesLessons,
        activeClassesQuizzes,
        hasActiveClassesLessons,
        hasActiveClassesQuizzes,
        continueLearningFromClasses,
        continueLearning,
        displayExploreChannels,
        displayClasses,
        missingResources,
      };
    },
    props: {
      loading: {
        type: Boolean,
        default: null,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .section:not(:first-child) {
    margin-top: 32px;
  }

  .section:first-child {
    margin-top: 16px;
  }

</style>
