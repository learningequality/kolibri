import { ref } from 'vue';
import { onboardingSteps } from 'kolibri-common/utils/onboardingSteps.js';

const TOUR_PROGRESS_KEY = 'kolibri_onboarding_tour_progress';
const TOUR_COMPLETE_KEY = 'kolibri_onboarding_tour_complete';
const TOUR_ACTIVE = 'kolibri_onboarding_tour_active';
const tourActive = ref(false);
const currentStepIndex = ref(0);

function startTour() {
  localStorage.setItem(TOUR_ACTIVE, 'true');
  tourActive.value = true;
}

function endTour() {
  localStorage.setItem(TOUR_ACTIVE, 'false');
  tourActive.value = false;
}
function getTourProgress(userId) {
  const progress = JSON.parse(localStorage.getItem(TOUR_PROGRESS_KEY));
  return progress?.userId === userId ? progress : null;
}

function saveTourProgress(userId, page, stepIndex) {
  localStorage.setItem(TOUR_PROGRESS_KEY, JSON.stringify({ userId, page, stepIndex }));
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
  if (!progress) {
    return false;
  }
  const pageKeys = Object.keys(onboardingSteps);
  const currentPageIndex = pageKeys.indexOf(page);
  const welcomeDismissed = localStorage.getItem('DEVICE_WELCOME_MODAL_DISMISSED');
  const prevPage = currentPageIndex === 0 ? null : pageKeys[currentPageIndex - 1];
  const prevPageSteps = prevPage ? onboardingSteps[prevPage] : [];
  const isLastStepOfPrevPage = prevPageSteps && progress.stepIndex === prevPageSteps.length - 1;
  const steps = onboardingSteps[page] || [];
  const isSamePage = progress.page === page;
  if (welcomeDismissed && progress && (isSamePage || isLastStepOfPrevPage)) {
    if (progress.stepIndex + 1 < steps.steps.length) {
      // Still steps left on current page
      currentStepIndex.value = progress.stepIndex + 1;
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
    resumeTour,
    currentStepIndex,
  };
}
