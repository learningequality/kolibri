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
      {
        name: 'NEW_CHANNEL_VERSION_PAGE',
        path: '/content/manage_channel/:channel_id/upgrade',
      },
    ],
  }),
};
