import get from 'lodash/get';
import router from 'kolibri.coreVue.router';
import store from 'kolibri.coreVue.vuex.store';
import { handleApiError } from 'kolibri.coreVue.vuex.actions';
import { ContentWizardPages } from './constants';
import {
  transitionWizardPage,
  showAvailableChannelsPageDirectly,
  BACKWARD,
  CANCEL,
} from './state/actions/contentWizardActions';
import { updateTreeViewTopic } from './state/actions/selectContentActions';

export const WizardTransitions = {
  GOTO_TOPIC_TREEVIEW: 'GOTO_TOPIC_TREEVIEW',
  GOTO_AVAILABLE_CHANNELS_PAGE: 'GOTO_AVAILABLE_CHANNELS_PAGE',
  LOADING_CHANNEL_METADATA: 'LOADING_CHANNEL_METADATA',
};

export function updateTopicLinkObject(node) {
  return {
    name: WizardTransitions.GOTO_TOPIC_TREEVIEW,
    query: {
      pk: node.pk,
    },
    params: {
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
    name: WizardTransitions.GOTO_TOPIC_TREEVIEW,
    path: '/content/wizard/topic',
    handler: ({ params, query }) => {
      let nextNode;
      if (!params.node) {
        nextNode = {
          // Works fine without title at the moment.
          path: store.state.pageState.wizardState.pathCache[params.pk],
          pk: query.pk,
        };
      } else {
        nextNode = params.node;
      }
      return updateTreeViewTopic(store, nextNode);
    },
  },
  {
    name: WizardTransitions.LOADING_CHANNEL_METADATA,
    path: '/content/wizard/loading/:channelId',
    handler: () => {
      // Redirect to /content if coming into URL directly without initiating workflow
      if (
        get(store.state.pageState, 'wizardState.pageName') !==
        ContentWizardPages.LOADING_CHANNEL_METADATA
      ) {
        return router.replace('/content');
      }
    },
  },
  {
    name: WizardTransitions.GOTO_AVAILABLE_CHANNELS_PAGE,
    path: '/content/wizard/availablechannels',
    handler: () => {
      const pageName = get(store.state.pageState, 'wizardState.pageName');
      if (!pageName) {
        return router.replace('/content');
      }
      if (
        pageName === ContentWizardPages.SELECT_CONTENT ||
        pageName === ContentWizardPages.LOADING_CHANNEL_METADATA
      ) {
        return transitionWizardPage(store, BACKWARD);
      }
    },
  },
  {
    name: 'wizardtransition',
    // Wizard transitions don't change the URL
    path: '',
    handler: ({ params }) => {
      if (params.transition === 'cancel') {
        transitionWizardPage(store, CANCEL);
      }
    },
  },
  {
    name: 'GOTO_AVAILABLE_CHANNELS_PAGE_DIRECTLY',
    path: '/content/available_channels',
    handler: ({ query }) => {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
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
];
