import routes from './routes';
import pluginModule from './modules/pluginModule';
import RootVue from './views/UsersPageIndex';
import KolibriApp from 'kolibri_app';

class UsersModule extends KolibriApp {
  get RootVue() {
    return RootVue;
  }
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

export default new UsersModule();
