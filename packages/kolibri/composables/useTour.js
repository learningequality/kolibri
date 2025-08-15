import { ref } from 'vue';

const tourActive = ref(false);

function startTour() {
  tourActive.value = true;
}

function endTour() {
  tourActive.value = false;
}

export default function useTour() {
  return {
    tourActive,
    startTour,
    endTour,
  };
}
