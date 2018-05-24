import router from 'kolibri.coreVue.router';
import store from 'kolibri.coreVue.vuex.store';
import {
  showAvailableChannelsPage,
  showSelectContentPage,
} from './state/actions/contentWizardActions';
import { updateTreeViewTopic } from './state/actions/selectContentActions';
import { ContentWizardPages } from './constants';
import { selectContentTopicLink } from './views/manage-content-page/manageContentLinks';

// To update the treeview topic programatically
export function navigateToTopicUrl(node) {
  router.push(selectContentTopicLink(node));
}

export default [
  {
    name: ContentWizardPages.AVAILABLE_CHANNELS,
    path: '/content/channels',
    handler: ({ query }) => {
      return showAvailableChannelsPage(store, {
        for_export: String(query.for_export) === 'true',
        drive_id: query.drive_id,
      });
    },
  },
  {
    name: ContentWizardPages.SELECT_CONTENT,
    path: '/content/channels/:channel_id',
    handler: ({ query, params }) => {
      // HACK don't refresh state when going from SELECT_CONTENT_TOPIC back to here
      const cachedChannelPath = store.state.pageState.wizardState.pathCache[params.channel_id];
      if (cachedChannelPath) {
        return updateTreeViewTopic(store, cachedChannelPath[0]);
      }

      return showSelectContentPage(store, {
        channel_id: params.channel_id,
        drive_id: query.drive_id,
        for_export: String(query.for_export) === 'true',
      });
    },
  },
  {
    name: ContentWizardPages.SELECT_CONTENT_TOPIC,
    path: '/content/channels/:channel_id/node/:node_id',
    handler: toRoute => {
      // If wizardState is not fully-hydrated, redirect to top-level channel page
      if (!store.state.pageState.wizardState.transferType) {
        router.replace({ ...toRoute, name: ContentWizardPages.SELECT_CONTENT });
      } else {
        const { params } = toRoute;
        let nextNode;
        if (!params.node) {
          nextNode = {
            // Works fine without title at the moment.
            path: store.state.pageState.wizardState.pathCache[params.node_id],
            id: params.node_id,
          };
        } else {
          nextNode = params.node;
        }
        return updateTreeViewTopic(store, nextNode);
      }
    },
  },
];
