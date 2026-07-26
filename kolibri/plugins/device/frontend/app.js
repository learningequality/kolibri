import Cookies from 'js-cookie';
import { get } from '@vueuse/core';
import router from 'kolibri/router';
import { IsPinAuthenticated } from 'kolibri/constants';
import useUser from 'kolibri/composables/useUser';
import KolibriApp from 'kolibri-app';
import useFacilities from 'kolibri-common/composables/useFacilities';
import RootVue from './views/DeviceIndex';
import routes from './routes';
import store from './store';

let viewPlugin = false;

class DeviceManagementModule extends KolibriApp {
  get routes() {
    return routes;
  }
  get RootVue() {
    return { ...RootVue, store };
  }
  get isPinAuthenticated() {
    return Cookies.get(IsPinAuthenticated) === 'true';
  }
  checkIfPinAuthenticationIsRequired(grantPluginAccess) {
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
    const { fetchFacilities, facilities } = useFacilities();
    // reset module states after leaving their respective page
    router.beforeEach((to, from, next) => {
      if (facilities.value.length === 0) {
        fetchFacilities().then(next, next);
      }
      next();
    });
    router.afterEach((toRoute, fromRoute) => {
      store.dispatch('resetModuleState', { toRoute, fromRoute });
    });
    router.beforeResolve((to, from, next) => {
      this.checkIfPinAuthenticationIsRequired(function () {
        viewPlugin = true;
        next();
      });
    });
    super.ready();
  }
}

export default new DeviceManagementModule();
