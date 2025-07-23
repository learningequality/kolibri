import DemoServerBannerContent from './DemoServerBannerContent';
import KolibriModule from 'kolibri-module';

class DemoServerModule extends KolibriModule {
  ready() {
    if (!window._coreBannerContent) {
      window._coreBannerContent = [];
    }
    window._coreBannerContent.push(DemoServerBannerContent);
  }
}

export default new DemoServerModule();
