import PageRoot from 'kolibri.coreVue.components.PageRoot';
import KolibriApp from 'kolibri_app';
import routes from './routes';
import pluginModule from './modules/pluginModule';

class MyDownloadsModule extends KolibriApp {
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

export default new MyDownloadsModule();
