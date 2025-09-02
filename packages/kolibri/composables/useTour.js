import { reactive, ref } from 'vue';
import { onboardingSteps } from 'kolibri/utils/onboardingSteps';

const TOUR_PROGRESS_KEY = 'kolibri_onboarding_tour_progress';
const TOUR_COMPLETE_KEY = 'kolibri_onboarding_tour_complete';
const TOUR_ACTIVE = 'kolibri_onboarding_tour_active';
const tourActive = ref(false);
const currentStepIndex = ref(0);
const tourActiveMap = reactive({});

function startTour(pageName) {
  // Small delay to let users see the page before tour darkens it
  setTimeout(() => {
    localStorage.setItem(TOUR_ACTIVE, 'true');
    tourActive.value = true;
    Object.keys(tourActiveMap).forEach(key => {
      tourActiveMap[key] = false;
    });
    tourActiveMap[pageName] = true;
  }, 400);
}

function endTour(pageName) {
  localStorage.setItem(TOUR_ACTIVE, 'false');
  tourActive.value = false;
  tourActiveMap[pageName] = false;
}
function isTourActive(pageName) {
  return !!tourActiveMap[pageName];
}

function getTourProgress(userId) {
  const progress = JSON.parse(localStorage.getItem(TOUR_PROGRESS_KEY));
  return progress?.userId === userId ? progress : null;
}

function saveTourProgress(userId, page, stepIndex, isTourActive) {
  localStorage.setItem(
    TOUR_PROGRESS_KEY,
    JSON.stringify({ userId, page, stepIndex, isTourActive }),
  );
}

function completeTour() {
  localStorage.setItem(TOUR_COMPLETE_KEY, 'true');
  localStorage.removeItem(TOUR_PROGRESS_KEY);
}

function isTourCompleted() {
  return localStorage.getItem(TOUR_COMPLETE_KEY) === 'true';
}
function resumeTour(userId, page) {
  const progress = getTourProgress(userId);
  if ((progress && progress.isTourActive === false) || !progress) {
    return false;
  }
  const pageKeys = Object.keys(onboardingSteps);
  const currentPageIndex = pageKeys.indexOf(page);
  const welcomeDismissed = localStorage.getItem('DEVICE_WELCOME_MODAL_DISMISSED');
  const prevPage = currentPageIndex === 0 ? null : pageKeys[currentPageIndex - 1];
  const prevPageSteps = prevPage ? onboardingSteps[prevPage].steps : [];
  const isLastStepOfPrevPage = prevPageSteps && progress.stepIndex === prevPageSteps.length - 1;
  const steps = onboardingSteps[page].steps || [];
  const isSamePage = progress.page === page;
  if (welcomeDismissed && progress && (isSamePage || isLastStepOfPrevPage)) {
    if (progress.stepIndex + 1 < steps.length) {
      // Still steps left on current page
      currentStepIndex.value = progress.stepIndex + 1;
      return true;
    } else if (progress.stepIndex + 1 === steps.length) {
      currentStepIndex.value = progress.stepIndex;
      return true;
    } else {
      endTour();
      return false;
    }
  }
  return false;
}

export default function useTour() {
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
    resumeTour,
    currentStepIndex,
  };
}
