import router from 'kolibri/router';
import { isNavigationFailure, NavigationFailureType } from 'vue-router';
import logger from 'kolibri-logging';
import useFacilities from 'kolibri-common/composables/useFacilities';
import { PageNames } from './constants';
import UserCreateSidePanel from './views/users/sidePanels/UserCreate/index.vue';
import MoveToTrashSidePanel from './views/users/sidePanels/MoveToTrashSidePanel';
import FilterUsersSidePanel from './views/users/sidePanels/FilterUsersSidePanel';
import AssignCoachesSidePanel from './views/users/sidePanels/AssignCoachesSidePanel';
import RemoveFromClassSidePanel from './views/users/sidePanels/RemoveFromClassSidePanel';
import EnrollLearnersSidePanel from './views/users/sidePanels/EnrollLearnersSidePanel';

const logging = logger.getLogger(__filename);

export function facilityParamRequiredGuard(toRoute, subtopicName) {
  const { userIsMultiFacilityAdmin } = useFacilities();
  if (userIsMultiFacilityAdmin.value && !toRoute.params.facility_id) {
    router
      .replace({
        name: 'ALL_FACILITIES_PAGE',
        params: { subtopicName },
      })
      .catch(e => {
        if (!isNavigationFailure(e, NavigationFailureType.duplicated)) {
          logging.debug(e);
          throw Error(e);
        }
      });
    return true;
  }
}

export function overrideRoute(route, newRoute) {
  // Override the route with a new one, preserving the params and query
  const { params, query } = route;
  return {
    ...newRoute,
    params: {
      ...params,
      ...newRoute.params,
    },
    query: {
      ...query,
      ...newRoute.query,
    },
  };
}

const sidePanelRoutes = [
  {
    name: PageNames.MOVE_TO_TRASH_TRASH_SIDE_PANEL,
    path: 'trash',
    component: MoveToTrashSidePanel,
  },
  {
    name: PageNames.FILTER_USERS_SIDE_PANEL,
    path: 'filter',
    component: FilterUsersSidePanel,
  },
  {
    name: PageNames.ASSIGN_COACHES_SIDE_PANEL,
    path: 'assign-coaches',
    component: AssignCoachesSidePanel,
  },
  {
    name: PageNames.REMOVE_FROM_CLASSES_SIDE_PANEL,
    path: 'remove-from-classes',
    component: RemoveFromClassSidePanel,
  },
  {
    name: PageNames.ENROLL_LEARNERS_SIDE_PANEL,
    path: 'enroll-learners',
    component: EnrollLearnersSidePanel,
  },
  {
    name: PageNames.ADD_NEW_USER_SIDE_PANEL,
    path: 'new',
    component: UserCreateSidePanel,
  },
];

export function getSidePanelRoutes(pageNames, suffix = '') {
  const pages = new Set(pageNames);
  const routes = sidePanelRoutes.filter(route => pages.has(route.name));
  if (!suffix) {
    return routes;
  }
  return routes.map(route => ({
    ...route,
    name: `${route.name}__${suffix}`,
  }));
}
