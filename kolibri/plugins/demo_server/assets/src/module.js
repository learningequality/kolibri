import coreBannerContent from 'kolibri.utils.coreBannerContent';
import KolibriModule from 'kolibri_module';
import DemoServerBannerContent from './DemoServerBannerContent';

class DemoServerModule extends KolibriModule {
  ready() {
    coreBannerContent.register(DemoServerBannerContent);
  }
}

export default new DemoServerModule();
