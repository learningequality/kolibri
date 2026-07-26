import KolibriApp from 'kolibri-app';
import routes from './routes';

class MyDownloadsModule extends KolibriApp {
  get routes() {
    return routes;
  }
}

export default new MyDownloadsModule();
