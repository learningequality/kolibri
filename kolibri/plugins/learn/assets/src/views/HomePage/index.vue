<template>

  <LearnAppBarPage :appBarTitle="learnString('learnLabel')">
    <div
      v-if="!loading"
      role="main"
    >
      <ResourceSyncingUiAlert
        v-if="missingResources"
        @syncComplete="hydrateHomePage"
      />
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
        :data-test="
          continueLearningFromClasses ? 'continueLearningFromClasses' : 'continueLearningOnYourOwn'
        "
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
        :short="
          Boolean(
            displayClasses ||
              continueLearning ||
              hasActiveClassesLessons ||
              hasActiveClassesQuizzes,
          )
        "
      />
    </div>
  </LearnAppBarPage>

</template>


<script>

  import { computed, getCurrentInstance } from 'vue';
  import { get, set } from '@vueuse/core';
  import client from 'kolibri/client';
  import urls from 'kolibri/urls';
  import useUser from 'kolibri/composables/useUser';
  import useChannels from 'kolibri-common/composables/useChannels';
  import ResourceSyncingUiAlert from '../ResourceSyncingUiAlert';
  import useDeviceSettings from '../../composables/useDeviceSettings';
  import useLearnerResources, {
    setClasses,
    setResumableContentNodes,
  } from '../../composables/useLearnerResources';
  import { setContentNodeProgress } from '../../composables/useContentNodeProgress';
  import { inClasses } from '../../composables/useCoreLearn';
  import { PageNames } from '../../constants';
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
      ResourceSyncingUiAlert,
    },
    mixins: [commonLearnStrings],
    setup() {
      const currentInstance = getCurrentInstance().proxy;
      const store = currentInstance.$store;
      const router = currentInstance.$router;

      const { isUserLoggedIn } = useUser();
      const { canAccessUnassignedContent } = useDeviceSettings();
      const { localChannelsCache, fetchChannels } = useChannels();
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
          get(resumableClassesResources).length > 0,
      );
      const continueLearningOnYourOwn = computed(
        () =>
          get(isUserLoggedIn) &&
          get(learnerFinishedAllClasses) &&
          get(canAccessUnassignedContent) &&
          get(resumableContentNodes).length > 0,
      );

      const continueLearning = computed(
        () => get(continueLearningFromClasses) || get(continueLearningOnYourOwn),
      );

      const hasActiveClassesLessons = computed(
        () =>
          get(isUserLoggedIn) && get(activeClassesLessons) && get(activeClassesLessons).length > 0,
      );
      const hasActiveClassesQuizzes = computed(
        () =>
          get(isUserLoggedIn) && get(activeClassesQuizzes) && get(activeClassesQuizzes).length > 0,
      );
      const hasChannels = computed(() => {
        return get(localChannelsCache).length > 0;
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

      function hydrateHomePage() {
        return client({ url: urls['kolibri:kolibri.plugins.learn:homehydrate']() }).then(
          response => {
            setClasses(response.data.classrooms);
            // Update our hydrated class membership boolean in case it has changed
            // since the learn page was opened.
            set(inClasses, Boolean(response.data.classrooms.length));
            setResumableContentNodes(
              response.data.resumable_resources.results || [],
              response.data.resumable_resources.more || null,
            );
            for (const progress of response.data.resumable_resources_progress) {
              setContentNodeProgress(progress);
            }
          },
        );
      }

      fetchChannels().then(channels => {
        if (!channels.length) {
          router.replace({ name: PageNames.LIBRARY });
          return;
        }

        // force fetch classes and resumable content nodes to make sure that the home
        // page is up-to-date when navigating to other 'Learn' pages and then back
        // to the home page
        return hydrateHomePage()
          .then(() => {
            store.commit('SET_PAGE_NAME', PageNames.HOME);
            store.dispatch('notLoading');
          })
          .catch(error => {
            return store.dispatch('handleApiError', { error, reloadOnReconnect: true });
          });
      });

      return {
        channels: localChannelsCache,
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
        hydrateHomePage,
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
