import KolibriModule from 'kolibri-module';
import DemoServerBannerContent from './DemoServerBannerContent';

class DemoServerModule extends KolibriModule {
  ready() {
    if (!window._coreBannerContent) {
      window._coreBannerContent = [];
    }
    window._coreBannerContent.push(DemoServerBannerContent);
  }
}

export default new DemoServerModule();
