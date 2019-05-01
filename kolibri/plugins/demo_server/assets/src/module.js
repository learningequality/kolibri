import store from 'kolibri.coreVue.vuex.store';
import DemoServerBannerContent from './DemoServerBannerContent';
import DemoServerBannerHeader from './DemoServerBannerHeader';
import KolibriModule from 'kolibri_module';

class DemoServerModule extends KolibriModule {
  ready() {
    if (!store.getters.isUserLoggedIn) {
      store.commit('SET_CORE_BANNER_CONTENT', { DemoServerBannerContent, DemoServerBannerHeader });
    }
  }
}

export default new DemoServerModule();
