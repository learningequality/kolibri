import Cookies from 'js-cookie';
import { get } from '@vueuse/core';
import router from 'kolibri.coreVue.router';
import { IsPinAuthenticated } from 'kolibri.coreVue.vuex.constants';
import useUser from 'kolibri.coreVue.composables.useUser';
import KolibriApp from 'kolibri_app';
import RootVue from './views/DeviceIndex';
import routes from './routes';
import pluginModule from './modules/pluginModule';

let viewPlugin = false;

class DeviceManagementModule extends KolibriApp {
  get routes() {
    return routes;
  }
  get RootVue() {
    return RootVue;
  }
  get pluginModule() {
    return pluginModule;
  }
  get isPinAuthenticated() {
    return Cookies.get(IsPinAuthenticated) === 'true';
  }
  checkIfPinAuthenticationIsRequired(store, grantPluginAccess) {
    const { isLearnerOnlyImport, isSuperuser, isFacilityAdmin, canManageContent } = useUser();
    if (
      get(isLearnerOnlyImport) &&
      !get(isFacilityAdmin) &&
      (get(isSuperuser) || get(canManageContent))
    ) {
      //While browsing within the device plugin, prevent expiry.
      //On page refresh within plugin, show pin prompt if cookie has expired.
      viewPlugin = viewPlugin ? viewPlugin : this.isPinAuthenticated;
      if (viewPlugin) {
        grantPluginAccess();
      } else {
        store.dispatch('displayPinModal', grantPluginAccess);
      }
    } else {
      grantPluginAccess();
    }
  }
  ready() {
    // reset module states after leaving their respective page
    router.beforeEach((to, from, next) => {
      if (this.store.state.core.facilities.length === 0) {
        this.store.dispatch('getFacilities').then(next, next);
      }
      next();
    });
    router.afterEach((toRoute, fromRoute) => {
      this.store.dispatch('resetModuleState', { toRoute, fromRoute });
    });
    router.beforeResolve((to, from, next) => {
      this.checkIfPinAuthenticationIsRequired(this.store, function () {
        viewPlugin = true;
        next();
      });
    });
    super.ready();
  }
}

export default new DeviceManagementModule();
