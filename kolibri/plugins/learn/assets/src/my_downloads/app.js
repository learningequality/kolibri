import KolibriApp from 'kolibri-app';
import routes from './routes';
import pluginModule from './modules/pluginModule';

class MyDownloadsModule extends KolibriApp {
  get routes() {
    return routes;
  }
  get pluginModule() {
    return pluginModule;
  }
  ready() {
    super.ready();
  }
}

export default new MyDownloadsModule();
