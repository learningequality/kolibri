import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router/composables';
import pickBy from 'lodash/pickBy';
import clamp from 'lodash/clamp';

/**
 * Composable for managing pagination state and navigation
 * Handles page changes, items per page, and URL query synchronization
 */
export default function usePagination({ usersCount, totalPages } = {}) {
  const route = useRoute();
  const router = useRouter();

  // Current page from URL query params
  const currentPage = computed({
    get() {
      return Number(route.query.page) || 1;
    },
    set(value) {
      router.push({
        ...route,
        query: pickBy({
          ...route.query,
          page: value > 1 ? value : null, // Don't include page=1 in URL
        }),
      });
    },
  });

  // Items per page from URL query params
  const itemsPerPage = computed({
    get() {
      return Number(route.query.page_size) || 30;
    },
    set(value) {
      router.push({
        ...route,
        query: pickBy({
          ...route.query,
          page_size: value !== 30 ? value : null, // Don't include default size in URL
          page: null, // Reset to first page when changing page size
        }),
      });
    },
  });

  // Calculate visible range for pagination display
  const startRange = computed(() => {
    return (currentPage.value - 1) * itemsPerPage.value;
  });

  const visibleStartRange = computed(() => {
    const count = usersCount?.value || 0;
    return Math.min(startRange.value + 1, count);
  });

  const endRange = computed(() => {
    return currentPage.value * itemsPerPage.value;
  });

  const visibleEndRange = computed(() => {
    const count = usersCount?.value || 0;
    return Math.min(endRange.value, count);
  });

  // Button states
  const previousButtonDisabled = computed(() => {
    const count = usersCount?.value || 0;
    return currentPage.value === 1 || count === 0;
  });

  const nextButtonDisabled = computed(() => {
    const count = usersCount?.value || 0;
    const total = totalPages?.value || 1;
    return total === 1 || currentPage.value === total || count === 0;
  });

  // Method to change page with bounds checking
  const changePage = change => {
    const total = totalPages?.value || 1;
    const newPage = clamp(currentPage.value + change, 1, total);
    currentPage.value = newPage;
  };

  // Method to go to specific page
  const goToPage = pageNumber => {
    const total = totalPages?.value || 1;
    currentPage.value = clamp(pageNumber, 1, total);
  };

  // Method to reset to first page
  const resetToFirstPage = () => {
    currentPage.value = 1;
  };

  return {
    // State
    currentPage,
    itemsPerPage,

    // Computed properties for display
    visibleStartRange,
    visibleEndRange,
    previousButtonDisabled,
    nextButtonDisabled,

    // Methods
    changePage,
    goToPage,
    resetToFirstPage,
  };
}
