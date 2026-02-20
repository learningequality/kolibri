import { get } from '@vueuse/core';
import { computed, getCurrentInstance } from 'vue';

const cardViewStyleQueryParam = 'cardViewStyle';

export default function useCardViewStyle(store, router) {
  // Get store and router references from the curent instance
  // but allow them to be passed in to allow for dependency
  // injection, primarily for tests.
  store = store || getCurrentInstance().proxy.$store;
  router = router || getCurrentInstance().proxy.$router;
  const route = computed(() => store.state.route || {});

  const currentCardViewStyle = computed({
    get() {
      const query = get(route).query || {};
      return query[cardViewStyleQueryParam] || 'card';
    },
    set(value) {
      const query = { ...(get(route).query || {}) };
      query[cardViewStyleQueryParam] = value;
      // Just catch an error from making a redundant navigation rather
      // than try to precalculate this.
      router.push({ ...get(route), query }).catch(() => {});
    },
  });

  return {
    currentCardViewStyle,
  };
}
