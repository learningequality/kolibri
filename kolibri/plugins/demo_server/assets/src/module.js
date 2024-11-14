import coreBannerContent from 'kolibri-common/utils/coreBannerContent';
import KolibriModule from 'kolibri-module';
import DemoServerBannerContent from './DemoServerBannerContent';

class DemoServerModule extends KolibriModule {
  ready() {
    coreBannerContent.register(DemoServerBannerContent);
  }
}

export default new DemoServerModule();
