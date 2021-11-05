import { get } from '@vueuse/core';
import { ContentNodeResource } from 'kolibri.resources';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import uniqBy from 'lodash/uniqBy';
import { PageNames } from '../../constants';
import useChannels from '../../composables/useChannels';
import useContentNodeProgress from '../../composables/useContentNodeProgress';
import useLearnerResources from '../../composables/useLearnerResources';
import { contentState, _collectionState } from '../coreLearn/utils';

const { channels } = useChannels();

const { fetchContentNodeProgress } = useContentNodeProgress();

const { fetchResumableContentNodes } = useLearnerResources();

// User-agnostic recommendations
function _getPopular(store) {
  return ContentNodeResource.fetchPopular({
    include_coach_content:
      store.getters.isAdmin || store.getters.isCoach || store.getters.isSuperuser,
  });
}

// User-specific recommendations
function _getNextSteps(store) {
  if (store.getters.isUserLoggedIn) {
    return ContentNodeResource.fetchNextSteps();
  }
  return Promise.resolve([]);
}

function _getResume(store) {
  if (store.getters.isUserLoggedIn) {
    return ContentNodeResource.fetchResume();
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
    store.dispatch('setAndCheckChannels'),
    // resolves to mapped content set because then resolves to its function's return value
  ]).then(([content, channels]) => [_mapContentSet(content), channels]);

  pagePrep.then(
    ([recommendations]) => {
      let recommendationsKey;
      switch (pageName) {
        case PageNames.RECOMMENDED_POPULAR:
          recommendationsKey = 'popular';
          break;
        case PageNames.RECOMMENDED_RESUME:
          recommendationsKey = 'resume';
          break;
        case PageNames.RECOMMENDED_NEXT_STEPS:
          recommendationsKey = 'nextSteps';
          break;
        default:
          break;
      }
      if (recommendationsKey) {
        store.commit('recommended/SET_STATE', { [recommendationsKey]: recommendations });
      }
      store.commit('SET_PAGE_NAME', pageName);
      store.commit('CORE_SET_PAGE_LOADING', false);
      store.commit('CORE_SET_ERROR', null);
    },
    error => store.dispatch('handleApiError', error)
  );
}

export function showLibrary(store) {
  if (!get(channels).length) {
    return;
  }
  // Special case for when only the page number changes:
  // Don't set the 'page loading' boolean, to prevent flash and loss of keyboard focus.
  if (store.state.pageName !== PageNames.LIBRARY) {
    store.commit('CORE_SET_PAGE_LOADING', true);
  }

  const promises = [
    ContentNodeResource.fetchCollection({
      getParams: {
        parent__isnull: true,
        include_coach_content:
          store.getters.isAdmin || store.getters.isCoach || store.getters.isSuperuser,
      },
    }),
  ];

  if (store.getters.isUserLoggedIn) {
    fetchContentNodeProgress({ resume: true });
    promises.push(fetchResumableContentNodes());
  }

  return ConditionalPromise.all(promises).only(
    samePageCheckGenerator(store),
    ([, channelCollection]) => {
      // we want them to be in the same order as the channels list
      const rootNodes = get(channels)
        .map(channel => {
          const node = _collectionState(channelCollection).find(n => n.channel_id === channel.id);
          if (node) {
            // The `channel` comes with additional data that is
            // not returned from the ContentNodeResource.
            // Namely thumbnail, description and tagline (so far)
            node.title = channel.name || node.title;
            node.thumbnail = channel.thumbnail;
            node.description = channel.tagline || channel.description;
            return node;
          }
        })
        .filter(Boolean);

      store.commit('SET_ROOT_NODES', rootNodes);

      store.commit('CORE_SET_PAGE_LOADING', false);
      store.commit('CORE_SET_ERROR', null);
      store.commit('SET_PAGE_NAME', PageNames.LIBRARY);
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
