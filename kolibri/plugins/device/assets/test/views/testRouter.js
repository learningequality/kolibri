import { createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';

const localVue = createLocalVue();

localVue.use(VueRouter);

export default {
  localVue,
  router: new VueRouter({
    routes: [
      {
        name: 'AVAILABLE_CHANNELS',
        path: '/content/channels',
      },
      {
        name: 'MANAGE_CONTENT_PAGE',
        path: '/content',
      },
      // More lenient about channel_id than real router
      {
        name: 'SELECT_CONTENT',
        path: '/content/channel/:channel_id?',
      },
    ],
  }),
};
