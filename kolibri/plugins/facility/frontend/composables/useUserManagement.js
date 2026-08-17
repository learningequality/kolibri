import pickBy from 'lodash/pickBy';
import isEqual from 'lodash/isEqual';
import { useRoute, useRouter } from 'vue-router/composables';
import { ref, computed, watch } from 'vue';
import ClassroomResource from 'kolibri-common/apiResources/ClassroomResource';
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import DeletedFacilityUserResource from 'kolibri-common/apiResources/DeletedFacilityUserResource';
import { handleApiError } from 'kolibri/utils/appError';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';
import { _userState } from '../modules/mappers';
import useUsersFilters from './useUsersFilters';

export default function useUserManagement({
  activeFacilityId,
  dateJoinedGt,
  softDeletedUsers = false,
} = {}) {
  const selectedUsers = ref(new Set());
  const classes = ref([]);
  const router = useRouter();
  const route = useRoute();
  // query params
  const page = computed(() => Number(route.query.page) || 1);
  const pageSize = computed(() => Number(route.query.page_size) || 30);
  const ordering = computed(() => route.query.ordering || null);
  const order = computed(() => route.query.order || '');
  const search = computed(() => route.query.search || null);

  const { routeFilters, numAppliedFilters, getBackendFilters, resetFilters } = useUsersFilters({
    classes,
  });

  const clearSelectedUsers = () => {
    selectedUsers.value = new Set();
  };

  const userResource = softDeletedUsers ? DeletedFacilityUserResource : FacilityUserResource;

  // `useList` reads these at fetch time rather than watching them, so refetching is driven by
  // the query-param watcher further down.
  const userParams = () =>
    pickBy({
      member_of: activeFacilityId,
      date_joined__gte: dateJoinedGt?.toISOString(),
      page: page.value,
      page_size: pageSize.value,
      search: search.value?.trim() || null,
      ordering: order.value === 'desc' ? `-${ordering.value}` : ordering.value || null,
      ...getBackendFilters(),
    });

  const {
    data: users,
    loading: dataLoading,
    error: usersError,
    count,
    totalPages: responseTotalPages,
    fetchData: fetchUsers,
  } = userResource.useList(userParams);

  const facilityUsers = computed(() => (users.value || []).map(_userState));
  const usersCount = computed(() => count.value ?? 0);
  const totalPages = computed(() => responseTotalPages.value ?? 0);

  // `useFetch` clears `loading` on success and on failure, and leaves it set for a superseded
  // fetch, so this covers every path the page's spinner should stop for.
  watch(dataLoading, isLoading => {
    if (!isLoading) {
      pageLoading.value = false;
    }
  });

  watch(usersError, error => {
    if (!error) {
      return;
    }
    // A 404 here is a stale page number, outliving the filter change that shrank the result set.
    if (error.status === 404 && page.value > 1) {
      router.push({ ...route, query: { ...route.query, page: 1 } });
    } else {
      handleApiError({ error, reloadOnReconnect: true, shouldThrow: false });
    }
  });

  const fetchClasses = async () => {
    try {
      const classList = await ClassroomResource.list({ parent: activeFacilityId });
      classes.value = classList;
    } catch (error) {
      handleApiError({ error, reloadOnReconnect: true });
    }
  };

  function onChange({ resetSelection = false, affectedClasses = null } = {}) {
    if (resetSelection) {
      clearSelectedUsers();
    }
    if (
      // If there isn't any specific class affected, always refetch
      affectedClasses === null ||
      // If there are affected classes, only refetch if one of them is in the current filters
      routeFilters.value.classes.some(classId => affectedClasses.includes(classId))
    ) {
      fetchUsers();
    }
  }

  // re-running fetchUsers whenever the relevant query params change
  watch(
    () => [
      page.value,
      pageSize.value,
      search.value,
      ordering.value,
      order.value,
      routeFilters.value,
    ],
    (newFilters, oldFilters) => {
      if (!isEqual(newFilters, oldFilters)) {
        fetchUsers();
      }
    },
    { immediate: true },
  );

  watch([numAppliedFilters, search], (newValues, oldValues) => {
    const [newNumFilters, newSearch] = newValues;
    const [oldNumFilters, oldSearch] = oldValues;

    if (newNumFilters !== oldNumFilters || newSearch !== oldSearch) {
      clearSelectedUsers();
    }
  });

  return {
    selectedUsers,
    facilityUsers,
    totalPages,
    usersCount,
    dataLoading,
    page,
    pageSize,
    ordering,
    order,
    search,
    classes,
    numAppliedFilters,
    // methods
    onChange,
    fetchUsers,
    fetchClasses,
    resetFilters,
    clearSelectedUsers,
  };
}
