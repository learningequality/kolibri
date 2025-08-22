import { reactive, ref } from 'vue';

const tourActive = ref(false);
const tourActiveMap = reactive({});

function startTour(pageName) {
  // Small delay to let users see the page before tour darkens it
  setTimeout(() => {
    tourActive.value = true;
    Object.keys(tourActiveMap).forEach(key => {
      tourActiveMap[key] = false;
    });
    tourActiveMap[pageName] = true;
  }, 400);
}

function endTour(pageName) {
  tourActive.value = false;
  tourActiveMap[pageName] = false;
}
function isTourActive(pageName) {
  return !!tourActiveMap[pageName];
}
export default function useTour() {
  return {
    tourActive,
    tourActiveMap,
    startTour,
    endTour,
    isTourActive,
  };
}
