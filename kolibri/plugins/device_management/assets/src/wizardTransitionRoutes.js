import router from 'kolibri.coreVue.router';
import store from 'kolibri.coreVue.vuex.store';
import { handleApiError } from 'kolibri.coreVue.vuex.actions';
import {
  showAvailableChannelsPageDirectly,
  showSelectContentPageDirectly,
} from './state/actions/contentWizardActions';
import { updateTreeViewTopic } from './state/actions/selectContentActions';

export const WizardTransitions = {
  GOTO_TOPIC_TREEVIEW: 'GOTO_TOPIC_TREEVIEW',
  GOTO_AVAILABLE_CHANNELS_PAGE: 'GOTO_AVAILABLE_CHANNELS_PAGE',
  LOADING_CHANNEL_METADATA: 'LOADING_CHANNEL_METADATA',
};

export function updateTopicLinkObject(node) {
  return {
    name: 'GOTO_SELECT_CONTENT_PAGE_TOPIC',
    params: {
      // TODO utilize id exclusively in import/export code
      node_id: node.id || node.pk,
      node,
    },
  };
}

// To update the treeview topic programatically
export function navigateToTopicUrl(node) {
  router.push(updateTopicLinkObject(node));
}

export function navigateToChannelMetaDataLoading(channelId) {
  router.push({
    name: WizardTransitions.LOADING_CHANNEL_METADATA,
    params: {
      channelId,
    },
  });
}

// Special fake routes so we can use router-link-dependant components inside
// the wizard modals/immersive-full-screen
export default [
  {
    name: 'GOTO_AVAILABLE_CHANNELS_PAGE_DIRECTLY',
    path: '/content/available_channels',
    handler: ({ query }) => {
      return showAvailableChannelsPageDirectly(store, {
        for_export: String(query.for_export) === 'true',
        drive_id: query.drive_id,
      }).catch(err => {
        // handle errors generically
        handleApiError(store, err);
        store.dispatch('RESET_WIZARD_STATE_FOR_AVAILABLE_CHANNELS');
        store.dispatch('CORE_SET_PAGE_LOADING', false);
      });
    },
  },
  {
    name: 'GOTO_SELECT_CONTENT_PAGE_DIRECTLY',
    path: '/content/channel/:channel_id',
    handler: ({ query, params }) => {
      return showSelectContentPageDirectly(store, {
        channel_id: params.channel_id,
        drive_id: query.drive_id,
        for_export: String(query.for_export) === 'true',
      }).catch(err => {
        // handle errors generically
        handleApiError(store, err);
        store.dispatch('RESET_WIZARD_STATE_FOR_AVAILABLE_CHANNELS');
        store.dispatch('CORE_SET_PAGE_LOADING', false);
      });
    },
  },
  {
    name: 'GOTO_SELECT_CONTENT_PAGE_TOPIC',
    path: '/content/channel/:channel_id/node/:node_id',
    handler: toRoute => {
      // If wizardState is not fully-hydrated, redirect to top-level channel page
      if (!store.state.pageState.wizardState.transferType) {
        router.replace({ ...toRoute, name: 'GOTO_SELECT_CONTENT_PAGE_DIRECTLY' });
      } else {
        const { params } = toRoute;
        let nextNode;
        if (!params.node) {
          nextNode = {
            // Works fine without title at the moment.
            path: store.state.pageState.wizardState.pathCache[params.node_id],
            pk: params.node_id,
          };
        } else {
          nextNode = params.node;
        }
        return updateTreeViewTopic(store, nextNode);
      }
    },
  },
];
