import { computed, inject, onUnmounted, provide, ref } from 'vue';
import usePageTitle from 'kolibri/composables/usePageTitle';

const SIDE_PANEL_TITLE = 'sidePanelTitle';
const OPEN_OVERLAYS = 'openOverlays';

/**
 * Shares the host page's title with the side panels it opens.
 * @param {Function|import('vue').Ref} title - The title the host passes to usePageTitle.
 * @returns {{ overlayOpen: import('vue').ComputedRef<boolean> }} Whether an OverlayHeading is
 * mounted, so the host should render SidePanelTitle.
 */
export function provideSidePanelTitle(title) {
  const openOverlays = ref(0);
  provide(SIDE_PANEL_TITLE, title);
  provide(OPEN_OVERLAYS, openOverlays);
  return { overlayOpen: computed(() => openOverlays.value > 0) };
}

/**
 * Marks an overlay with its own <h1> as open until the calling component unmounts.
 */
export function useOverlayHeading() {
  const openOverlays = inject(OPEN_OVERLAYS, ref(0));
  openOverlays.value++;
  onUnmounted(() => openOverlays.value--);
}

/**
 * Registers the title a host page provides for a side panel, which renders its own <h1>.
 * Under a host that renders SidePanelTitle, panels render OverlayHeading instead.
 * @returns {{ documentTitle: import('vue').ComputedRef<string> }} See usePageTitle.
 */
export default function useSidePanelTitle() {
  // Hosts that provide no title leave the tab at the bare site title.
  return usePageTitle(inject(SIDE_PANEL_TITLE, []), { hasVisibleHeading: true });
}
