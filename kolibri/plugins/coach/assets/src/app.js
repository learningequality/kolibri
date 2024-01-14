import { get } from '@vueuse/core';
import useUser from 'kolibri.coreVue.composables.useUser';
import redirectBrowser from 'kolibri.utils.redirectBrowser';
import { setChannelInfo } from 'kolibri.coreVue.vuex.actions';
import router from 'kolibri.coreVue.router';
import PageRoot from 'kolibri.coreVue.components.PageRoot';
import KolibriApp from 'kolibri_app';
import { PageNames } from './constants';
import routes from './routes';
import pluginModule from './modules/pluginModule';
import { LessonsPageNames } from './constants/lessonsConstants';

class CoachToolsModule extends KolibriApp {
  get stateSetters() {
    return [setChannelInfo];
  }
  get routes() {
    return routes;
  }
  get RootVue() {
    return PageRoot;
  }
  get pluginModule() {
    return pluginModule;
  }
  ready() {
    const { isLearnerOnlyImport } = useUser();
    router.beforeEach((to, from, next) => {
      if (get(isLearnerOnlyImport)) {
        redirectBrowser();
        return;
      }
      this.store.dispatch('loading');
      const promises = [];
      // Clear the snackbar at every navigation to prevent it from re-appearing
      // when the next page component mounts.
      if (this.store.state.core.snackbar.isVisible) {
        this.store.dispatch('clearSnackbar');
      }
      this.store.commit('SET_PAGE_NAME', to.name);
      if (
        to.name &&
        !to.params.classId &&
        !['CoachClassListPage', 'StatusTestPage', 'CoachPrompts', 'AllFacilitiesPage'].includes(
          to.name
        )
      ) {
        this.store.dispatch('coachNotifications/stopPolling');
      }
      // temporary condition as we're gradually moving all promises below this line to local page handlers and therefore need to skip those that we already refactored here https://github.com/learningequality/kolibri/issues/11219
      if (
        to.name && [
          PageNames.EXAMS ||
            LessonsPageNames.SUMMARY ||
            LessonsPageNames.SELECTION_ROOT ||
            LessonsPageNames.SELECTION ||
            LessonsPageNames.SELECTION_SEARCH,
        ]
      ) {
        next();
        return;
      }

      if (
        to.name &&
        to.params.classId &&
        !['CoachClassListPage', 'StatusTestPage', 'CoachPrompts', 'AllFacilitiesPage'].includes(
          to.name
        )
      ) {
        promises.push(this.store.dispatch('initClassInfo', to.params.classId));
      }

      if (this.store.getters.isSuperuser && this.store.state.core.facilities.length === 0) {
        promises.push(this.store.dispatch('getFacilities').catch(() => {}));
      }

      if (promises.length > 0) {
        Promise.all(promises).then(next, error => {
          this.store.dispatch('handleApiError', { error });
        });
      } else {
        next();
      }
    });

    router.afterEach((toRoute, fromRoute) => {
      this.store.dispatch('resetModuleState', { toRoute, fromRoute });
    });
    super.ready();
  }
}

export default new CoachToolsModule();
