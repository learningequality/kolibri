/**
 * A composable function containing logic related to languages
 */

import sortBy from 'lodash/sortBy';
import { computed, ref } from '@vue/composition-api';
import { get } from '@vueuse/core';
import plugin_data from 'kolibri-plugin-data';

const langArray = plugin_data.languages ? plugin_data.languages : [];
const langMap = {};

export function setLanguages(langs) {
  for (const lang of langs) {
    langMap[lang.id] = lang;
  }
}

setLanguages(langArray);

// The refs are defined in the outer scope so they can be used as a shared store
const languagesMap = ref(langMap);

export default function useLanguages() {
  const languages = computed(() => sortBy(Object.values(get(languagesMap)), 'id'));
  return {
    languages,
    languagesMap,
  };
}
