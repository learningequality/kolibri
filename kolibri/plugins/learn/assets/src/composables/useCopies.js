import { set } from '@vueuse/core';
import { reactive } from 'kolibri.lib.vueCompositionApi';

// Shared store
var displayedCopies = reactive({ copies: [] });

export default function useCopies() {
  function setCopies(copies) {
    set(displayedCopies, 'copies', copies);
  }

  function clearCopies() {
    set(displayedCopies, 'copies', []);
  }

  return {
    displayedCopies,
    setCopies,
    clearCopies,
  };
}
