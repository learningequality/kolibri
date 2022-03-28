import { set } from '@vueuse/core';
import { reactive } from 'kolibri.lib.vueCompositionApi';

// Shared store
var displayedCopies = reactive([]);

export default function useCopies() {
  function setCopies(copies) {
    set(displayedCopies, copies);
  }

  function clearCopies() {
    set(displayedCopies, []);
  }

  return {
    displayedCopies,
    setCopies,
    clearCopies,
  };
}
