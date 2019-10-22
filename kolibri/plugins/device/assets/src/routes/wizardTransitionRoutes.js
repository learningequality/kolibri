import omit from 'lodash/omit';
import router from 'kolibri.coreVue.router';
import store from 'kolibri.coreVue.vuex.store';
import {
  showAvailableChannelsPage,
  showSelectContentPage,
  updateTreeViewTopic,
} from '../modules/wizard/handlers';
import { ContentWizardPages } from '../constants';
import { selectContentTopicLink } from '../views/ManageContentPage/manageContentLinks';
import AvailableChannelsPage from '../views/AvailableChannelsPage';
import SelectContentPage from '../views/SelectContentPage';

// To update the treeview topic programatically
export function navigateToTopicUrl(node, query) {
  router.push(selectContentTopicLink(node, query));
}

export default [
  {
    name: ContentWizardPages.AVAILABLE_CHANNELS,
    component: AvailableChannelsPage,
    path: '/content/channels',
    handler: ({ query }) => {
      return showAvailableChannelsPage(store, {
        for_export: String(query.for_export) === 'true',
        address_id: query.address_id,
        drive_id: query.drive_id,
      });
    },
  },
  {
    name: ContentWizardPages.SELECT_CONTENT,
    component: SelectContentPage,
    path: '/content/channels/:channel_id',
    handler: toRoute => {
      const { query, params } = toRoute;
      const { node_id } = query;
      if (node_id) {
        // If wizardState is not fully-hydrated, redirect to top-level channel page
        if (!store.state.manageContent.wizard.transferType || node_id === params.channel_id) {
          router.replace({ ...toRoute, query: omit(query, 'node_id') });
        } else {
          let nextNode;
          if (!params.node) {
            nextNode = {
              // Works fine without title at the moment.
              path: store.state.manageContent.wizard.pathCache[node_id],
              id: node_id,
            };
          } else {
            nextNode = params.node;
          }
          return updateTreeViewTopic(store, nextNode);
        }
      } else {
        const cachedChannelPath = store.state.manageContent.wizard.pathCache[params.channel_id];
        if (cachedChannelPath) {
          updateTreeViewTopic(store, cachedChannelPath[0]);
        } else {
          return showSelectContentPage(store, {
            channel_id: params.channel_id,
            address_id: query.address_id,
            drive_id: query.drive_id,
            for_export: String(query.for_export) === 'true',
          });
        }
      }
    },
  },
];
