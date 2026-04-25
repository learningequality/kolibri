import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router/composables';

const DEFAULT_PAGE_SIZE = 30;

/**
 * Composable for managing pagination state via URL query parameters.
 * Provides a writable `currentPage` computed that syncs with `route.query.page`
 * and a writable `itemsPerPage` computed that syncs with `route.query.page_size`.
 * @returns {{
 *   currentPage: import('vue').WritableComputedRef<number>,
 *   itemsPerPage: import('vue').WritableComputedRef<number>,
 * }} Reactive bindings for the current page and page size.
 */
export default function usePagination() {
  const route = useRoute();
  const router = useRouter();

  function pushQuery(query) {
    router.push({ name: route.name, params: route.params, query });
  }

  // Current page from URL query params
  const currentPage = computed({
    get() {
      return Number(route.query.page) || 1;
    },
    set(value) {
      const normalizedCurrent = Number(route.query.page) || 1;
      if (value === normalizedCurrent) {
        return;
      }
      const query = { ...route.query };
      if (value > 1) {
        query.page = value;
      } else {
        delete query.page;
      }
      pushQuery(query);
    },
  });

  // Items per page from URL query params
  const itemsPerPage = computed({
    get() {
      return Number(route.query.page_size) || DEFAULT_PAGE_SIZE;
    },
    set(value) {
      const normalizedCurrent = Number(route.query.page_size) || DEFAULT_PAGE_SIZE;
      if (value === normalizedCurrent) {
        return;
      }
      const query = { ...route.query };
      if (value !== DEFAULT_PAGE_SIZE) {
        query.page_size = value;
      } else {
        delete query.page_size;
      }
      delete query.page; // Reset to first page when changing page size
      pushQuery(query);
    },
  });

  return {
    currentPage,
    itemsPerPage,
  };
}
