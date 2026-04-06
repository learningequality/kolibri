import store from 'kolibri/store';
import router from 'kolibri/router';
import { handleApiError } from 'kolibri/utils/appError';
import useUser from 'kolibri/composables/useUser';
import { get } from '@vueuse/core';
import useFacilities from 'kolibri-common/composables/useFacilities';
import useFacility from 'kolibri-common/composables/useFacility';
import plugin_data from 'kolibri-plugin-data';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';
import AllFacilitiesPage from '../views/AllFacilitiesPage';
import CoachClassListPage from '../views/CoachClassListPage';
import ClassLearnersListPage from '../views/ClassLearnersListPage';
import HomePage from '../views/home/HomePage';
import CoachPrompts from '../views/CoachPrompts';
import HomeActivityPage from '../views/home/HomeActivityPage';
import StatusTestPage from '../views/common/status/StatusTestPage';
import { ClassesPageNames } from '../../../learn/frontend/constants';
import { PageNames } from '../constants';
import { classIdParamRequiredGuard } from './utils';
import examRoutes from './examRoutes';
import lessonsRoutes from './lessonsRoutes';
import learnersRoutes from './learnersRoutes';
import groupsRoutes from './groupsRoutes';
import attendanceRoutes from './attendanceRoutes';
import coursesRoutes from './coursesRoutes';

function showHomePage(toRoute) {
  const initClassInfoPromise = store.dispatch('initClassInfo', toRoute.params.classId);
  const { isSuperuser } = useUser();
  const { fetchFacilities, facilities } = useFacilities();

  const getFacilitiesPromise =
    get(isSuperuser) && get(facilities).length === 0
      ? fetchFacilities().catch(() => {})
      : Promise.resolve();

  return Promise.all([initClassInfoPromise, getFacilitiesPromise]);
}

export default [
  ...examRoutes,
  ...lessonsRoutes,
  ...learnersRoutes,
  ...groupsRoutes,
  ...attendanceRoutes,
  ...(plugin_data.courses_exist ? coursesRoutes : []),
  {
    name: 'AllFacilitiesPage',
    path: '/facilities/:subtopicName?',
    component: AllFacilitiesPage,
    props: true,
    handler() {
      pageLoading.value = false;
    },
  },
  {
    path: '/:facility_id?/classes/:subtopicName?',
    component: CoachClassListPage,
    props: true,
    async handler(toRoute) {
      // loading state is handled locally
      pageLoading.value = false;
      // if user only has access to one facility, facility_id will not be accessible from URL,
      // but always defaulting to userFacilityId would cause problems for multi-facility admins
      const { userFacilityId } = useUser();
      const { facilities, fetchFacilities, userIsMultiFacilityAdmin } = useFacilities();
      const { setFacilityId } = useFacility();
      const facilityId = toRoute.params.facility_id || get(userFacilityId);

      if (facilities.value.length === 0) {
        await fetchFacilities();
      }

      if (userIsMultiFacilityAdmin.value && !toRoute.params.facility_id) {
        return router.replace({
          name: 'AllFacilitiesPage',
          params: { subtopicName: toRoute.params.subtopicName },
        });
      }

      await setFacilityId(facilityId);

      store.dispatch('setClassList', facilityId).then(
        () => {
          if (!store.getters.classListPageEnabled) {
            // If no class list page, redirect to the first (and only) class and
            // to the originally-selected subtopic, if available
            router.replace({
              name: toRoute.params.subtopicName || HomePage.name,
              params: { classId: store.state.classList[0].id },
            });
            return;
          }
        },
        error => handleApiError({ error, reloadOnReconnect: true }),
      );
    },
    meta: {
      titleParts: ['classesLabel'],
    },
  },
  {
    name: PageNames.HOME_PAGE,
    path: '/:classId?/home',
    component: HomePage,
    handler: async (toRoute, fromRoute, next) => {
      if (classIdParamRequiredGuard(toRoute, HomePage.name, next)) {
        return;
      }
      await showHomePage(toRoute);
      pageLoading.value = false;
    },
    meta: {
      titleParts: ['CLASS_NAME'],
    },
  },
  {
    path: '/:classId/home/activity',
    component: HomeActivityPage,
    handler: async toRoute => {
      await showHomePage(toRoute);
      pageLoading.value = false;
    },
    meta: {
      titleParts: ['activityLabel', 'CLASS_NAME'],
    },
  },
  {
    name: ClassesPageNames.CLASS_LEARNERS_LIST_VIEWER,
    path: '/:classId/learners/devices',
    component: ClassLearnersListPage,
    handler() {
      pageLoading.value = false;
    },
  },
  {
    path: '/about/statuses',
    component: StatusTestPage,
    handler() {
      pageLoading.value = false;
    },
  },
  {
    path: '/coach-prompts',
    component: CoachPrompts,
    handler() {
      pageLoading.value = false;
    },
  },
  {
    path: '/',
    // Redirect to AllFacilitiesPage if a superuser and device has > 1 facility
    beforeEnter(to, from, next) {
      const { userIsMultiFacilityAdmin } = useFacilities();
      if (userIsMultiFacilityAdmin.value) {
        next({ name: 'AllFacilitiesPage', replace: true });
      } else {
        next({ name: 'CoachClassListPage', replace: true });
      }
    },
  },
];
