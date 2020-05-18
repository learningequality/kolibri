import store from 'kolibri.coreVue.vuex.store';
import router from 'kolibri.coreVue.router';
import AllFacilitiesPage from '../views/AllFacilitiesPage';
import CoachClassListPage from '../views/CoachClassListPage';
import HomePage from '../views/home/HomePage';
// import CoachPrompts from '../views/CoachPrompts';
import HomeActivityPage from '../views/home/HomeActivityPage';
import StatusTestPage from '../views/common/status/StatusTestPage';
import reportRoutes from './reportRoutes';
import planRoutes from './planRoutes';

export default [
  ...planRoutes,
  ...reportRoutes,
  {
    path: '/facilities',
    component: AllFacilitiesPage,
    handler() {
      store.dispatch('notLoading');
    },
  },
  {
    path: '/classes',
    component: CoachClassListPage,
    handler(toRoute) {
      store.dispatch('loading');
      store.dispatch('setClassList', toRoute.query.facility_id).then(
        () => {
          if (!store.getters.classListPageEnabled) {
            // If no class list page, redirect to
            // the first (and only) class.
            router.replace({
              name: HomePage.name,
              params: { classId: store.state.classList[0].id },
            });
            return;
          }
          store.dispatch('notLoading');
        },
        error => store.dispatch('handleApiError', error)
      );
    },
    meta: {
      titleParts: ['classesLabel'],
    },
  },
  {
    path: '/:classId/home',
    component: HomePage,
    handler() {
      store.dispatch('notLoading');
    },
    meta: {
      titleParts: ['CLASS_NAME'],
    },
  },
  {
    path: '/:classId/home/activity',
    component: HomeActivityPage,
    handler() {
      store.dispatch('notLoading');
    },
    meta: {
      titleParts: ['activityLabel', 'CLASS_NAME'],
    },
  },
  {
    path: '/about/statuses',
    component: StatusTestPage,
    handler() {
      store.dispatch('notLoading');
    },
  },
  // NOTE: Commenting out CoachPrompts route so the component and its messages
  // won't be translated
  // {
  //   path: '/coach-prompts',
  //   component: CoachPrompts,
  //   handler() {
  //     store.dispatch('notLoading');
  //   },
  // },
  {
    path: '/',
    // Redirect to AllFacilitiesPage if a superuser and device has > 1 facility
    beforeEnter(to, from, next) {
      if (store.getters.isSuperuser && store.state.core.facilities.length > 1) {
        next({ name: 'AllFacilitiesPage' });
      } else {
        next({ name: 'CoachClassListPage' });
      }
    },
  },
];
