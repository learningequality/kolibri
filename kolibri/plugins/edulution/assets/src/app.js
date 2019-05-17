import router from 'kolibri.coreVue.router';
import {
  setFacilitiesAndConfig,
  prepareLearnApp,
} from '../../../learn/assets/src/modules/coreLearn/actions';
import RootVue from './views/EdulutionIndex';
import routes from './routes';
import pluginModule from './modules/pluginModule';
import KolibriApp from 'kolibri_app';

class EdulutionModule extends KolibriApp {
  get stateSetters() {
    return [prepareLearnApp, setFacilitiesAndConfig];
  }
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
    // after every navigation, block double-clicks
    return super.ready().then(() => {
      router.afterEach((toRoute, fromRoute) => {
        this.store.dispatch('blockDoubleClicks');
        this.store.dispatch('resetModuleState', { toRoute, fromRoute });
      });
    });
  }
}

export default new EdulutionModule();
