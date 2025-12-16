import { computed, reactive, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router/composables';

import { UserKinds } from 'kolibri/constants';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';

import { DateRangeFilters } from '../constants';

/**
 * Composable to manage user filters in the user management pages.
 *
 * @param {object} options
 * @param {Array} options.classes - Ref to the list of classes available for filtering.
 * @returns
 */
export default function useUsersFilters({ classes }) {
  const router = useRouter();
  const route = useRoute();

  const routeFilters = computed(() => {
    return {
      userTypes: route.query.user_types?.split(',') || [],
      classes: route.query.classes?.split(',') || [],
      birthYearStart: route.query.birth_year_start || null,
      birthYearEnd: route.query.birth_year_end || null,
      creationDate: route.query.creation_date || null,
    };
  });

  const workingFilters = reactive({
    userTypes: [],
    classes: [],
    birthYear: {
      start: null,
      end: null,
    },
    creationDate: {},
  });

  const numAppliedFilters = computed(() => {
    let count = 0;
    if (routeFilters.value.userTypes.length) {
      count += 1;
    }
    if (routeFilters.value.classes.length) {
      count += 1;
    }
    if (routeFilters.value.birthYearStart || routeFilters.value.birthYearEnd) {
      count += 1;
    }
    if (routeFilters.value.creationDate) {
      count += 1;
    }
    return count;
  });

  const { lastNDaysLabel$, thisMonthLabel$, lastNMonthsLabel$, lastYearLabel$, allTimeLabel$ } =
    bulkUserManagementStrings;

  const userFilterOptions = [
    { id: UserKinds.SUPERUSER, label: coreStrings.superAdminsLabel$(), icon: 'superAdmins' },
    { id: UserKinds.LEARNER, label: coreStrings.learnersLabel$(), icon: 'learners' },
    { id: UserKinds.ADMIN, label: coreStrings.adminsLabel$(), icon: 'admins' },
    { id: UserKinds.COACH, label: coreStrings.coachesLabel$(), icon: 'coaches' },
  ];

  const classesOptions = computed(() =>
    classes.value
      .map(cls => ({
        id: cls.id,
        label: cls.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  );

  const creationDateOptions = [
    {
      value: DateRangeFilters.LAST_7_DAYS,
      label: lastNDaysLabel$({ num: 7 }),
      dateSubtraction: {
        days: 7,
      },
    },
    {
      value: DateRangeFilters.LAST_30_DAYS,
      label: lastNDaysLabel$({ num: 30 }),
      dateSubtraction: {
        days: 30,
      },
    },
    {
      value: DateRangeFilters.THIS_MONTH,
      label: thisMonthLabel$(),
      dateSubtraction: {
        days: new Date().getDate() - 1, // Days in the current month
      },
    },
    {
      value: DateRangeFilters.LAST_6_MONTHS,
      label: lastNMonthsLabel$({ num: 6 }),
      dateSubtraction: {
        months: 6,
      },
    },
    {
      value: DateRangeFilters.LAST_YEAR,
      label: lastYearLabel$(),
      dateSubtraction: {
        years: 1,
      },
    },
    {
      value: DateRangeFilters.ALL_TIME,
      label: allTimeLabel$(),
    },
  ];

  watch(
    routeFilters,
    newFilters => {
      workingFilters.userTypes = [...newFilters.userTypes];
      workingFilters.classes = [...newFilters.classes];
      workingFilters.birthYear.start = newFilters.birthYearStart;
      workingFilters.birthYear.end = newFilters.birthYearEnd;
      workingFilters.creationDate =
        creationDateOptions.find(option => option.value === newFilters.creationDate) || {};
    },
    { immediate: true },
  );

  /**
   * Apply the current filters to the route by updating the query parameters,
   * and pushing the new route. This will remove from the query any filters
   * that are not longer applied, but will leave any other query parameters intact.
   *
   * @param {object} options
   * @param {string} options.nextRouteName - The name of the route to navigate to
   *                                         after applying filters.
   */
  const applyFilters = ({ nextRouteName } = {}) => {
    const nextQuery = { ...route.query };
    delete nextQuery.page; // Reset to the first page when applying filters

    if (workingFilters.userTypes.length) {
      nextQuery.user_types = workingFilters.userTypes.join(',');
    } else {
      delete nextQuery.user_types;
    }

    if (workingFilters.classes.length) {
      nextQuery.classes = workingFilters.classes.join(',');
    } else {
      delete nextQuery.classes;
    }

    if (workingFilters.birthYear.start) {
      nextQuery.birth_year_start = workingFilters.birthYear.start;
    } else {
      delete nextQuery.birth_year_start;
    }

    if (workingFilters.birthYear.end) {
      nextQuery.birth_year_end = workingFilters.birthYear.end;
    } else {
      delete nextQuery.birth_year_end;
    }

    if (workingFilters.creationDate.value) {
      nextQuery.creation_date = workingFilters.creationDate.value;
    } else {
      delete nextQuery.creation_date;
    }

    router.push({ ...route, name: nextRouteName || route.name, query: nextQuery });
  };

  const getBackendFilters = () => {
    const backendFilters = {};

    const creationDate =
      creationDateOptions.find(option => option.value === routeFilters.value.creationDate) || {};
    if (creationDate.dateSubtraction) {
      const startDate = new Date();
      if (creationDate.dateSubtraction.days) {
        startDate.setDate(startDate.getDate() - creationDate.dateSubtraction.days);
      }
      if (creationDate.dateSubtraction.months) {
        startDate.setMonth(startDate.getMonth() - creationDate.dateSubtraction.months);
      }
      if (creationDate.dateSubtraction.years) {
        startDate.setFullYear(startDate.getFullYear() - creationDate.dateSubtraction.years);
      }
      backendFilters.date_joined__gte = startDate.toISOString();
    }

    if (routeFilters.value.userTypes.length) {
      backendFilters.user_type__in = routeFilters.value.userTypes;
    }

    if (routeFilters.value.classes.length) {
      backendFilters.related_to__in = routeFilters.value.classes;
    }

    if (routeFilters.value.birthYearStart) {
      backendFilters.birth_year_gte = routeFilters.value.birthYearStart;
    }

    if (routeFilters.value.birthYearEnd) {
      backendFilters.birth_year_lte = routeFilters.value.birthYearEnd;
    }

    return backendFilters;
  };

  const resetWorkingFilters = () => {
    workingFilters.userTypes = [];
    workingFilters.classes = [];
    workingFilters.birthYear.start = null;
    workingFilters.birthYear.end = null;
    workingFilters.creationDate = {};
  };

  const resetFilters = () => {
    resetWorkingFilters();
    applyFilters();
  };

  return {
    // Filters
    routeFilters,
    workingFilters,
    numAppliedFilters,

    // Options
    classesOptions,
    userFilterOptions,
    creationDateOptions,

    // Methods
    applyFilters,
    resetFilters,
    getBackendFilters,
    resetWorkingFilters,
  };
}
