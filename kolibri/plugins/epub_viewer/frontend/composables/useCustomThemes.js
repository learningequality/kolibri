import { ref } from 'vue';
import Lockr from 'lockr';
import { v4 as uuidv4 } from 'uuid';
import { CUSTOM_THEMES_STORAGE_KEY } from '../views/EpubConstants';

/**
 * Persistence for learner-defined EPUB themes.
 *
 * Themes are stored in localStorage as a map keyed by a stable uuid `id`, so a
 * theme's identity is independent of its (editable) `name`. The reactive map is
 * created once at module scope and shared by every consumer, so a mutation made
 * through one component is immediately reflected in all of them; localStorage is
 * kept in sync as the persistent source of truth.
 */
const customThemes = ref(Lockr.get(CUSTOM_THEMES_STORAGE_KEY) || {});

function persist() {
  Lockr.set(CUSTOM_THEMES_STORAGE_KEY, customThemes.value);
}

export default function useCustomThemes() {
  function save(id, theme) {
    const stored = { ...theme, id };
    customThemes.value = { ...customThemes.value, [id]: stored };
    persist();
    return stored;
  }

  function createCustomTheme(theme) {
    return save(uuidv4(), theme);
  }

  function updateCustomTheme(id, theme) {
    return save(id, theme);
  }

  function removeCustomTheme(id) {
    const next = { ...customThemes.value };
    delete next[id];
    customThemes.value = next;
    persist();
  }

  function isDuplicateName(name, excludeId = null) {
    return Object.values(customThemes.value).some(
      theme => theme.name === name && theme.id !== excludeId,
    );
  }

  return {
    customThemes,
    createCustomTheme,
    updateCustomTheme,
    removeCustomTheme,
    isDuplicateName,
  };
}
