import PageRoot from 'kolibri.coreVue.components.PageRoot';
import routes from './routes';
import pluginModule from './modules/pluginModule';
import KolibriApp from 'kolibri_app';

class PoliciesModule extends KolibriApp {
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
    super.ready();
  }
}

export default new PoliciesModule();
