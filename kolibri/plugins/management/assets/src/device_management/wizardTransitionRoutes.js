import get from 'lodash/get';
import router from 'kolibri.coreVue.router';
import store from 'kolibri.coreVue.vuex.store';
import { ContentWizardPages } from './constants';
import { transitionWizardPage } from './state/actions/contentWizardActions';
import { updateTreeViewTopic } from './state/actions/selectContentActions';

export const WizardTransitions = {
  GOTO_TOPIC_TREEVIEW: 'GOTO_TOPIC_TREEVIEW',
  GOTO_AVAILABLE_CHANNELS_PAGE: 'GOTO_AVAILABLE_CHANNELS_PAGE',
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

// Special fake routes so we can use router-link-dependant components inside
// the wizard modals/immersive-full-screen
export default [
  {
    name: WizardTransitions.GOTO_TOPIC_TREEVIEW,
    path: '/content/wizard/topic',
    handler: ({ params, query }) => {
      let nextNode;
      // Redirect to /content if coming into URL directly without initiating workflow
      if (
        get(store.state.pageState, 'wizardState.pageName') !== ContentWizardPages.SELECT_CONTENT
      ) {
        return router.replace('/content');
      }
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
    name: WizardTransitions.GOTO_AVAILABLE_CHANNELS_PAGE,
    path: '/content/wizard/availablechannels',
    handler: () => {
      const pageName = get(store.state.pageState, 'wizardState.pageName');
      if (!pageName) {
        return router.replace('/content');
      }
      if (pageName === ContentWizardPages.SELECT_CONTENT) {
        return transitionWizardPage(store, 'backward');
      }
    },
  },
  {
    name: 'wizardtransition',
    // Wizard transitions don't change the URL
    path: '',
    handler: ({ params }) => {
      if (params.transition === 'cancel') {
        transitionWizardPage(store, 'cancel');
      }
    },
  },
];
