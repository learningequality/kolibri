import coreBannerContent from 'kolibri.utils.coreBannerContent';
import DemoServerBannerContent from './DemoServerBannerContent';
import KolibriModule from 'kolibri_module';

class DemoServerModule extends KolibriModule {
  ready() {
    coreBannerContent.register(DemoServerBannerContent);
  }
}

export default new DemoServerModule();
