import KolibriApp from 'kolibri-app';
import routes from './routes';

class PoliciesModule extends KolibriApp {
  get routes() {
    return routes;
  }
}

export default new PoliciesModule();
