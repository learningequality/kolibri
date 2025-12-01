import { reactive, ref } from 'vue';
import { onboardingSteps } from 'kolibri/utils/onboardingSteps';
import useUser from 'kolibri/composables/useUser';
import Lockr from 'lockr';

const TOUR_PROGRESS_KEY = 'kolibri_onboarding_tour_progress';
const TOUR_COMPLETE_KEY = 'kolibri_onboarding_tour_complete';
const TOUR_ACTIVE = 'kolibri_onboarding_tour_active';

const tourActive = ref(false);
const currentStepIndex = ref(0);
const tourActiveMap = reactive({});

export default function useTour() {
  const { currentUserId } = useUser();

  function getProgressKey() {
    return `${TOUR_PROGRESS_KEY}_${currentUserId.value}`;
  }

  /**
   * Saving the tour progress of all pages to easily resume if needed
   * Example stored value (per user):
   * {
   *   "pages": {
   *     "LibraryPage": { "stepIndex": 3, "isTourActive": false },
   *     "ExploreLibraries": { "stepIndex": 1, "isTourActive": true }
   *   }
   * }
   */
  function saveTourProgress(page, stepIndex, isTourActive) {
    const key = getProgressKey();
    const progress = Lockr.get(key, { pages: {} });

    if (!progress.pages) {
      progress.pages = {};
    }

    progress.pages[page] = {
      stepIndex,
      isTourActive,
    };

    Lockr.set(key, progress);
  }

  function getTourProgress() {
    const key = getProgressKey();
    return Lockr.get(key, null);
  }

  function completeTour() {
    const userId = currentUserId.value;

    // Marking the tour as complete for the current user
    // Completion map: { "userId1": true, "userId2": true, ... }
    const completedMap = Lockr.get(TOUR_COMPLETE_KEY, {});
    completedMap[userId] = true;
    Lockr.set(TOUR_COMPLETE_KEY, completedMap);

    // Clear the tour progress for the current user
    Lockr.rm(getProgressKey());
  }

  function isTourCompleted() {
    const userId = currentUserId.value;
    const completedMap = Lockr.get(TOUR_COMPLETE_KEY, {});
    return !!completedMap[userId];
  }

  function startTour(pageName) {
    if (isTourCompleted()) return;

    const stepsForPage = onboardingSteps[pageName]?.steps || [];
    // Check if tour progress exists for current user for pageName
    const existingProgress = getTourProgress();
    const currentPageProgress = existingProgress?.pages?.[pageName];

    if (currentPageProgress) {
      const isLastStep = currentPageProgress.stepIndex >= stepsForPage.length - 1;
      // If isTourActive is false or user completed all of the steps for current page,
      // do not start the tour
      if (currentPageProgress.isTourActive === false || isLastStep) return;
      // Otherwise, user progress exists for pageName but steps are incomplete;
      // set currentStepIndex to the saved stepIndex
      currentStepIndex.value = currentPageProgress.stepIndex;
    } else {
      currentStepIndex.value = 0;
    }

    // Small delay to let users see the page before tour darkens it
    setTimeout(() => {
      Lockr.set(TOUR_ACTIVE, true);
      tourActive.value = true;
      Object.keys(tourActiveMap).forEach(key => {
        tourActiveMap[key] = false;
      });
      tourActiveMap[pageName] = true;
    }, 400);
  }

  function endTour(pageName) {
    Lockr.set(TOUR_ACTIVE, false);
    tourActive.value = false;
    tourActiveMap[pageName] = false;
  }

  function isTourActive(pageName) {
    return !!tourActiveMap[pageName];
  }

  return {
    tourActive,
    startTour,
    endTour,
    getTourProgress,
    saveTourProgress,
    completeTour,
    isTourCompleted,
    isTourActive,
    tourActiveMap,
    currentStepIndex,
  };
}
