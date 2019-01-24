import store from 'kolibri.coreVue.vuex.store';
import router from 'kolibri.coreVue.router';
import { ClassroomResource } from 'kolibri.resources';
import CoachClassListPage from '../views/CoachClassListPage';
import HomePage from '../views/home/HomePage';
import HomeActivityPage from '../views/home/HomeActivityPage';
import reportRoutes from './reportRoutes';
import planRoutes from './planRoutes';

export default [
  ...planRoutes,
  ...reportRoutes,
  {
    path: '/',
    component: CoachClassListPage,
    handler() {
      const classroomsPromise = ClassroomResource.fetchCollection({
        getParams: { role: 'coach' },
        force: true,
      });
      classroomsPromise.then(classrooms => {
        if (classrooms.length === 1) {
          router.replace({
            name: HomePage.name,
            params: { classId: classrooms[0].id },
          });
          return;
        }
        store.dispatch('loading');
        store
          .dispatch('setClassList')
          .then(
            () => store.dispatch('notLoading'),
            error => store.dispatch('handleApiError', error)
          );
      });
    },
  },
  {
    path: '/:classId/home',
    component: HomePage,
    handler() {
      store.dispatch('notLoading');
    },
  },
  {
    path: '/:classId/home/activity',
    component: HomeActivityPage,
    handler() {
      store.dispatch('notLoading');
    },
  },
  {
    path: '*',
    redirect: '/',
  },
];
