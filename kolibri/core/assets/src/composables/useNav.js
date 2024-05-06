import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import { get } from '@vueuse/core';
import { computed } from 'kolibri.lib.vueCompositionApi';

export default function useNav() {
  const { windowIsSmall } = useKResponsiveWindow();
  const topBarHeight = computed(() => (get(windowIsSmall) ? 56 : 64));
  return {
    topBarHeight,
  };
}
