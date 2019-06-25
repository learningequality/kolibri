import store from 'kolibri.coreVue.vuex.store';
import coreBannerContent from 'kolibri.utils.coreBannerContent';
import DemoServerBannerContent from './DemoServerBannerContent';
import KolibriModule from 'kolibri_module';

class DemoServerModule extends KolibriModule {
  ready() {
    coreBannerContent.register(DemoServerBannerContent);
    store.commit('SET_CORE_BANNER_VISIBLE', !store.getters.isUserLoggedIn);
  }
}

export default new DemoServerModule();
