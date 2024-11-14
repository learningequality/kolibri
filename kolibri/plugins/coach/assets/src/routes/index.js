import store from 'kolibri/store';
import router from 'kolibri/router';
import useUser from 'kolibri/composables/useUser';
import { get } from '@vueuse/core';
import AllFacilitiesPage from '../views/AllFacilitiesPage';
import CoachClassListPage from '../views/CoachClassListPage';
import ClassLearnersListPage from '../views/ClassLearnersListPage';
import HomePage from '../views/home/HomePage';
import CoachPrompts from '../views/CoachPrompts';
import HomeActivityPage from '../views/home/HomeActivityPage';
import StatusTestPage from '../views/common/status/StatusTestPage';
import { ClassesPageNames } from '../../../../learn/assets/src/constants';
import { PageNames } from '../constants';
import { classIdParamRequiredGuard } from './utils';
import examRoutes from './examRoutes';
import lessonsRoutes from './lessonsRoutes';
import learnersRoutes from './learnersRoutes';
import groupsRoutes from './groupsRoutes';

function showHomePage(toRoute) {
  const initClassInfoPromise = store.dispatch('initClassInfo', toRoute.params.classId);
  const { isSuperuser } = useUser();
  const getFacilitiesPromise =
    get(isSuperuser) && store.state.core.facilities.length === 0
      ? store.dispatch('getFacilities').catch(() => {})
      : Promise.resolve();

  return Promise.all([initClassInfoPromise, getFacilitiesPromise]);
}

export default [
  ...examRoutes,
  ...lessonsRoutes,
  ...learnersRoutes,
  ...groupsRoutes,
  {
    name: 'AllFacilitiesPage',
    path: '/facilities/:subtopicName?',
    component: AllFacilitiesPage,
    props: true,
    handler() {
      store.dispatch('notLoading');
    },
  },
  {
    path: '/:facility_id?/classes/:subtopicName?',
    component: CoachClassListPage,
    props: true,
    handler(toRoute) {
      // loading state is handled locally
      store.dispatch('notLoading');
      // if user only has access to one facility, facility_id will not be accessible from URL,
      // but always defaulting to userFacilityId would cause problems for multi-facility admins
      const { userFacilityId } = useUser();
      const facilityId = toRoute.params.facility_id || get(userFacilityId);
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
        error => store.dispatch('handleApiError', { error, reloadOnReconnect: true }),
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
      store.dispatch('notLoading');
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
      store.dispatch('notLoading');
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
      store.dispatch('notLoading');
    },
  },
  {
    path: '/about/statuses',
    component: StatusTestPage,
    handler() {
      store.dispatch('notLoading');
    },
  },
  {
    path: '/coach-prompts',
    component: CoachPrompts,
    handler() {
      store.dispatch('notLoading');
    },
  },
  {
    path: '/',
    // Redirect to AllFacilitiesPage if a superuser and device has > 1 facility
    beforeEnter(to, from, next) {
      const { userIsMultiFacilityAdmin } = useUser();
      if (get(userIsMultiFacilityAdmin)) {
        next({ name: 'AllFacilitiesPage', replace: true });
      } else {
        next({ name: 'CoachClassListPage', replace: true });
      }
    },
  },
];
