/**
 * Provides a place to store last tabs interaction
 * and helper methods to save and retrieve it.
 * This information is typically used to find out
 * if a tab was clicked recently so that we can decide
 * on whether we should programatically re-focus it after
 * navigating to a page.
 *
 * Motivation: Our routing architecture where parts of a page
 * containing tabs get reloaded on route change would result
 * in losing focus from the active tab. Therefore, we need
 * to programatically re-focus after components are mounted again.
 * However, for that we need to be able to estimate when navigation
 * occured as a result of user interaction with tabs because in other
 * cases focus shouldn't be manipulated (e.g. when visiting a page for
 * the first time before clicking on tabs) .
 *
 * Usage: When tabs are clicked, save that interaction by calling `saveTabsClick`.
 * Then when you need find out if tabs were clicked recently,
 * call `wereTabsClickedRecently`.
 */
import { reactive } from 'vue';

// tabs interaction is considered to be recent
// when it's not older than ...
const RECENT_INTERACTION_LIMIT_IN_MS = 3000;
const TabsEvents = {
  CLICK: 'click',
};

/**
 * Needs to be placed outside of the `useCoachTabs`
 * function so that it behaves like global state.
 * Why: Due to our routing structure, tab components are re-mounted
 * after a tab is clicked. Without placing this state outside, it would
 * be lost as components that use this composable are initialized again.
 */
const lastTabsInteraction = reactive({
  tabsInterfaceId: '',
  event: '',
  timestamp: '',
});

export function useCoachTabs() {
  /**
   * Stores an interaction with tabs
   *
   * @param {String} tabsInterfaceId ID of a tabbed interface interacted with
   * @param {String} event An event kind. Available kinds: 'click'
   */
  function saveTabsInteraction(tabsInterfaceId, event) {
    lastTabsInteraction.tabsInterfaceId = tabsInterfaceId;
    lastTabsInteraction.event = event;
    lastTabsInteraction.timestamp = Date.now();
  }

  /**
   * Stores a click interaction with tabs
   *
   * @param {String} tabsInterfaceId ID of a tabbed interface interacted with
   */
  function saveTabsClick(tabsInterfaceId) {
    saveTabsInteraction(tabsInterfaceId, TabsEvents.CLICK);
  }

  /**
   * @param {String} tabsInterfaceId ID of a tabbed interface
   * @returns {Boolean} `true` when tabs with the provided ID were
   *                    clicked recently
   */
  function wereTabsClickedRecently(tabsInterfaceId) {
    if (lastTabsInteraction.tabsInterfaceId !== tabsInterfaceId) {
      return false;
    }
    const diff = Math.abs(Date.now() - lastTabsInteraction.timestamp);
    return diff < RECENT_INTERACTION_LIMIT_IN_MS;
  }

  return {
    saveTabsClick,
    wereTabsClickedRecently,
  };
}
