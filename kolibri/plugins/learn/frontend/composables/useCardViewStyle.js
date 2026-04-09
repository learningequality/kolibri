import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router/composables';

const cardViewStyleQueryParam = 'cardViewStyle';

export default function useCardViewStyle() {
  const route = useRoute();
  const router = useRouter();

  const currentCardViewStyle = computed({
    get() {
      return route.query[cardViewStyleQueryParam] || 'card';
    },
    set(value) {
      const query = { ...route.query };
      query[cardViewStyleQueryParam] = value;
      // Just catch an error from making a redundant navigation rather
      // than try to precalculate this.
      router.push({ ...route, query }).catch(() => {});
    },
  });

  return {
    currentCardViewStyle,
  };
}
