import KolibriModule from 'kolibri_module';
import * as coreActions from 'kolibri.coreVue.vuex.actions';
import router from 'kolibri.coreVue.router';

import Vue from 'kolibri.lib.vue';

import RootVue from './views';
import store from './state/store';

class ManagementModule extends KolibriModule {
  ready() {
    coreActions.getCurrentSession(store).then(() => {
      const routes = [

      ];

      this.rootvue = new Vue({
        el: 'rootvue',
        render: createElement => createElement(RootVue),
        router: router.init(routes),
      });
    });
  }
}

const managementModule = new ManagementModule();

export { managementModule as default };
