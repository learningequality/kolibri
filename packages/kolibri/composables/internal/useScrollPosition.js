import { computed } from 'vue';
import { get } from '@vueuse/core';

export default function useScrollPosition() {
  const _scrollPositions = {};

  const scrollPosition = computed({
    get() {
      // Use key set by Vue Router on the history state.
      const key = (window.history.state || {}).key;
      const defaultPos = { x: 0, y: 0 };
      if (key && _scrollPositions[key]) {
        return _scrollPositions[key];
      }
      return defaultPos;
    },
    set(newLocation) {
      // reference location can be { x: 0, y: 0 } coordinates using a Object,
      // or a string i.e. a css selector
      // for any instance
      let x, y;
      if (newLocation instanceof String) {
        if (document.querySelector(newLocation)) {
          const position = document.querySelector(newLocation).getBoundingClientRect();
          x = position.left;
          y = position.top;
        } else {
          x = 0;
          y = 0;
        }
      } else if (newLocation instanceof Object) {
        if (!isNaN(newLocation.x)) {
          x = newLocation.x;
        } else {
          x = 0;
        }
        if (!isNaN(newLocation.y)) {
          y = newLocation.y;
        } else {
          y = 0;
        }
      } else {
        x = 0;
        y = 0;
      }
      const key = (window.history.state || {}).key;
      // Only set if we have a vue router key on the state,
      // otherwise we don't do anything.
      if (key) {
        _scrollPositions[window.history.state.key] = { x: x, y: y };
      }
    },
  });

  function scrollToSavedPosition() {
    // set the scrollPosition of the window to the saved position state
    // for the current history state OR to the default scrollPosition { x: 0, y: 0}
    const position = get(scrollPosition);
    window.scrollTo(position.x, position.y);
  }

  function doNotSaveScrollPosition() {
    // called when the page's scroll position should NOT be saved in the current history state
    const key = (window.history.state || {}).key;
    // If we have a vue router key on the state, unset it.
    if (key) {
      delete _scrollPositions[window.history.state.key];
    }
    // Otherwise we don't do anything.
  }

  return {
    scrollPosition,
    scrollToSavedPosition,
    doNotSaveScrollPosition,
  };
}
