import { get } from '@vueuse/core';
import useUser from 'kolibri.coreVue.composables.useUser';
import redirectBrowser from 'kolibri.utils.redirectBrowser';
import router from 'kolibri.coreVue.router';
import RootVue from './views/FacilityIndex';
import routes from './routes';
import pluginModule from './modules/pluginModule';
import KolibriApp from 'kolibri_app';

class FacilityManagementModule extends KolibriApp {
  get routes() {
    return routes;
  }
  get RootVue() {
    return RootVue;
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
      if (this.store.getters.isSuperuser && this.store.state.core.facilities.length === 0) {
        this.store.dispatch('getFacilities').then(next, next);
      } else {
        next();
      }
    });
    // reset module states after leaving their respective page
    router.afterEach((toRoute, fromRoute) => {
      this.store.dispatch('resetModuleState', { toRoute, fromRoute });
    });
    super.ready();
  }
}

export default new FacilityManagementModule();
