import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router/composables';
import pickBy from 'lodash/pickBy';
import debounce from 'lodash/debounce';

/**
 * Composable for managing search functionality in the Users table
 * Handles search term state and URL query parameter synchronization
 */
export default function useUsersTableSearch() {
  const route = useRoute();
  const router = useRouter();
  const filterTextboxRef = ref(null);

  // Create debounced function for updating search in URL
  const updateSearchInUrl = value => {
    if (value === '') {
      value = null;
    }
    router.push({
      ...route,
      query: pickBy({
        ...route.query,
        search: value,
        page: null, // Reset to first page when searching
      }),
    });
  };

  const debouncedSearchTerm = debounce(updateSearchInUrl, 300);

  // Computed property for search term with getter/setter
  const searchTerm = computed({
    get() {
      return route.query.search || '';
    },
    set(value) {
      debouncedSearchTerm(value);
    },
  });

  // Method to focus the search textbox
  const focusSearchBox = () => {
    if (filterTextboxRef.value?.focus) {
      filterTextboxRef.value.focus();
    }
  };

  // Method to clear search
  const clearSearch = () => {
    searchTerm.value = '';
  };

  return {
    searchTerm,
    filterTextboxRef,
    focusSearchBox,
    clearSearch,
  };
}
