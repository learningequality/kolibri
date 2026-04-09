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
  const facilityUsers = ref([]);
  const totalPages = ref(0);
  const usersCount = ref(0);
  const dataLoading = ref(false);
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

  const fetchUsers = async () => {
    dataLoading.value = true;
    try {
      const fetchResource = softDeletedUsers ? DeletedFacilityUserResource : FacilityUserResource;
      const resp = await fetchResource.fetchCollection({
        getParams: pickBy({
          member_of: activeFacilityId,
          date_joined__gte: dateJoinedGt?.toISOString(),
          page: page.value,
          page_size: pageSize.value,
          search: search.value?.trim() || null,
          ordering: order.value === 'desc' ? `-${ordering.value}` : ordering.value || null,
          ...getBackendFilters(),
        }),
        force: true,
      });
      facilityUsers.value = resp.results.map(_userState);
      totalPages.value = resp.total_pages;
      usersCount.value = resp.count;
      dataLoading.value = false;
      pageLoading.value = false;
    } catch (error) {
      pageLoading.value = false;
      // In case of 404 error because of stale pagination try loading users of page 1
      if (error.status === 404 && page.value > 1) {
        router.push({ ...route, query: { ...route.query, page: 1 } });
      } else {
        handleApiError({ error, reloadOnReconnect: true });
      }
    }
  };

  const fetchClasses = async () => {
    try {
      const classList = await ClassroomResource.fetchCollection({
        getParams: { parent: activeFacilityId },
        force: true,
      });
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
