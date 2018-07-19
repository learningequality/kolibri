import { ContentNodeSlimResource, ContentNodeProgressResource } from 'kolibri.resources';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import uniq from 'lodash/uniq';
import uniqBy from 'lodash/uniqBy';
import { PageNames } from '../../constants';
import { contentState, setAndCheckChannels } from './main';

// User-agnostic recommendations
function _getPopular() {
  return ContentNodeSlimResource.fetchPopular({ by_role: true });
}

// User-specific recommendations
function _getNextSteps(store) {
  if (store.getters.isUserLoggedIn) {
    return ContentNodeSlimResource.fetchNextSteps({
      by_role: true,
    });
  }
  return Promise.resolve([]);
}

function _getResume(store) {
  if (store.getters.isUserLoggedIn) {
    return ContentNodeSlimResource.fetchResume({
      by_role: true,
    });
  }
  return Promise.resolve([]);
}

function _mapContentSet(contentSet) {
  return uniqBy(contentSet, 'content_id').map(contentState);
}

function _showRecSubpage(store, getContentPromise, pageName, channelId = null) {
  store.commit('CORE_SET_PAGE_LOADING', true);
  // promise that resolves with content array, already mapped to state
  const pagePrep = Promise.all([
    getContentPromise(store, channelId),
    setAndCheckChannels(store),
    // resolves to mapped content set because then resolves to its function's return value
  ]).then(([content, channels]) => [_mapContentSet(content), channels]);

  pagePrep.then(
    ([recommendations, channels]) => {
      if (!channels.length) {
        return;
      }
      const recPageState = {
        recommendations,
      };
      if (channelId) {
        const currentChannel = store.getters.getChannelObject(channelId);
        const channelTitle = currentChannel.title;
        recPageState.channelTitle = channelTitle;
      }
      store.commit('SET_PAGE_STATE', recPageState);
      store.commit('SET_PAGE_NAME', pageName);
      store.commit('CORE_SET_PAGE_LOADING', false);
      store.commit('CORE_SET_ERROR', null);
    },
    error => store.dispatch('handleApiError', error)
  );
}

export function showRecommended(store) {
  store.commit('SET_EMPTY_LOGGING_STATE');
  // Special case for when only the page number changes:
  // Don't set the 'page loading' boolean, to prevent flash and loss of keyboard focus.
  const state = store.state;
  if (state.pageName !== PageNames.RECOMMENDED) {
    store.commit('CORE_SET_PAGE_LOADING', true);
  }

  return ConditionalPromise.all([
    _getNextSteps(store),
    _getPopular(),
    _getResume(store),
    setAndCheckChannels(store),
  ]).only(
    samePageCheckGenerator(store),
    ([nextSteps, popular, resume, channels]) => {
      if (!channels.length) {
        return;
      }
      const pageState = {
        // Hard to guarantee this uniqueness on the database side, so
        // do a uniqBy content_id here, to prevent confusing repeated
        // content items.
        nextSteps: _mapContentSet(nextSteps),
        popular: _mapContentSet(popular),
        resume: _mapContentSet(resume),
      };

      store.commit('SET_PAGE_STATE', pageState);

      // Only load contentnodes progress if the user is logged in
      if (store.getters.isUserLoggedIn) {
        const contentNodeIds = uniq([...nextSteps, ...popular, ...resume].map(({ id }) => id));

        if (contentNodeIds.length > 0) {
          ContentNodeProgressResource.getCollection({ ids: contentNodeIds })
            .fetch()
            .then(progresses => {
              store.commit('SET_RECOMMENDED_NODES_PROGRESS', progresses);
            });
        }
      }

      store.commit('CORE_SET_PAGE_LOADING', false);
      store.commit('CORE_SET_ERROR', null);
      store.commit('SET_PAGE_NAME', PageNames.RECOMMENDED);
    },
    error => {
      store.dispatch('handleApiError', error);
    }
  );
}

export function showPopularPage(store) {
  _showRecSubpage(store, _getPopular, PageNames.RECOMMENDED_POPULAR);
}

export function showResumePage(store) {
  _showRecSubpage(store, _getResume, PageNames.RECOMMENDED_RESUME);
}

export function showNextStepsPage(store) {
  _showRecSubpage(store, _getNextSteps, PageNames.RECOMMENDED_NEXT_STEPS);
}
