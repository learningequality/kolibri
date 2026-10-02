import { inject, provide } from 'vue';
import usePageTitle from 'kolibri/composables/usePageTitle';

const SIDE_PANEL_TITLE = 'sidePanelTitle';

/**
 * Shares the host page's title with the side panels it opens.
 * @param {Function|import('vue').Ref} title - The title the host passes to usePageTitle.
 */
export function provideSidePanelTitle(title) {
  provide(SIDE_PANEL_TITLE, title);
}

/**
 * Registers the title a host page provides for a side panel, which renders its own <h1>.
 * @returns {{ documentTitle: import('vue').ComputedRef<string> }} See usePageTitle.
 */
export default function useSidePanelTitle() {
  // Hosts that provide no title leave the tab at the bare site title.
  return usePageTitle(inject(SIDE_PANEL_TITLE, []), { hasVisibleHeading: true });
}
