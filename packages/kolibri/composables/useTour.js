import { reactive, ref } from 'vue';

const tourActive = ref(false);
const tourActiveMap = reactive({});

function startTour(pageName) {
  tourActive.value = true;
  Object.keys(tourActiveMap).forEach(key => {
    tourActiveMap[key] = false;
  });
  tourActiveMap[pageName] = true;
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
