import store from 'kolibri.coreVue.vuex.store';
import router from 'kolibri.coreVue.router';
import CoachClassListPage from '../views/CoachClassListPage';
import HomePage from '../views/home/HomePage';
import HomeActivityPage from '../views/home/HomeActivityPage';
import StatusTestPage from '../views/common/status/StatusTestPage';
import reportRoutes from './reportRoutes';
import planRoutes from './planRoutes';

export default [
  ...planRoutes,
  ...reportRoutes,
  {
    path: '/',
    component: CoachClassListPage,
    handler() {
      store.dispatch('loading');
      store.dispatch('setClassList').then(
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
  {
    path: '*',
    redirect: '/',
  },
];
