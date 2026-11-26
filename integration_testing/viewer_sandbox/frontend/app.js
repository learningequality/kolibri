import KolibriApp from 'kolibri-app';
import routes from './routes';

class ViewerSandboxModule extends KolibriApp {
  get routes() {
    return routes;
  }
}

export default new ViewerSandboxModule();
