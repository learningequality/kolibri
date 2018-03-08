import { ContentNodeResource } from 'kolibri.resources';
import { currentUserId, getChannelObject, isUserLoggedIn } from 'kolibri.coreVue.vuex.getters';
import {
  samePageCheckGenerator,
  setChannelInfo,
  handleApiError,
} from 'kolibri.coreVue.vuex.actions';
import { PageNames } from '../../constants';
import { contentState, setAndCheckChannels } from './main';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import uniqBy from 'lodash/uniqBy';
import { createTranslator } from 'kolibri.utils.i18n';

const translator = createTranslator('learnerRecommendationPageTitles', {
  popularPageTitle: 'Popular',
  resumePageTitle: 'Resume',
  nextStepsPageTitle: 'Next Steps',
  featuredInChannelPageTitle: 'Featured - { currentChannel }',
  learnContentPageTitle: '{ currentContent } - { currentChannel }',
  learnPageTitle: 'Learn',
});

// User-agnostic recommendations
function _getPopular() {
  return ContentNodeResource.getCollection({ popular: 'true' }).fetch();
}

function _getFeatured(state, channelId) {
  return ContentNodeResource.getAllContentCollection({ channel_id: channelId }).fetch();
}

// User-specific recommendations
function _getNextSteps(state) {
  if (isUserLoggedIn(state)) {
    return ContentNodeResource.getCollection({ next_steps: currentUserId(state) }).fetch();
  }
  return Promise.resolve([]);
}

function _getResume(state) {
  if (isUserLoggedIn(state)) {
    return ContentNodeResource.getCollection({ resume: currentUserId(state) }).fetch();
  }
  return Promise.resolve([]);
}

function _mapContentSet(contentSet) {
  return uniqBy(contentSet, 'content_id').map(contentState);
}

function _showRecSubpage(store, getContentPromise, pageName, windowTitleId, channelId = null) {
  // promise that resolves with content array, already mapped to state
  const pagePrep = Promise.all([
    getContentPromise(store.state, channelId),
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
      let pageTitle;
      if (channelId) {
        const currentChannel = getChannelObject(store.state, channelId);
        const channelTitle = currentChannel.title;
        recPageState.channelTitle = channelTitle;
        pageTitle = translator.$tr(windowTitleId, { currentChannel: channelTitle });
      } else {
        pageTitle = translator.$tr(windowTitleId);
      }
      store.dispatch('SET_PAGE_STATE', recPageState);
      store.dispatch('SET_PAGE_NAME', pageName);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_TITLE', pageTitle);
    },
    error => handleApiError(error)
  );
}

export function showLearn(store) {
  store.dispatch('SET_EMPTY_LOGGING_STATE');
  // Special case for when only the page number changes:
  // Don't set the 'page loading' boolean, to prevent flash and loss of keyboard focus.
  const state = store.state;
  if (state.pageName !== PageNames.RECOMMENDED) {
    store.dispatch('CORE_SET_PAGE_LOADING', true);
  }

  return ConditionalPromise.all([
    _getNextSteps(state),
    _getPopular(),
    _getResume(state),
    setAndCheckChannels(store),
  ]).only(
    samePageCheckGenerator(store),
    ([nextSteps, popular, resume, channels]) => {
      if (!channels.length) {
        return;
      }
      const featuredChannels = channels.slice(0, 3);
      const pageState = {
        // Hard to guarantee this uniqueness on the database side, so
        // do a uniqBy content_id here, to prevent confusing repeated
        // content items.
        nextSteps: _mapContentSet(nextSteps),
        popular: _mapContentSet(popular),
        resume: _mapContentSet(resume),
        featured: {},
      };
      featuredChannels.forEach(channel => {
        pageState.featured[channel.id] = [];
      });

      store.dispatch('SET_PAGE_STATE', pageState);

      featuredChannels.forEach(channel => {
        _getFeatured(state, channel.id).only(samePageCheckGenerator(store), featured => {
          store.dispatch('SET_FEATURED_CHANNEL_CONTENTS', channel.id, _mapContentSet(featured));
        });
      });

      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('SET_PAGE_NAME', PageNames.RECOMMENDED);

      store.dispatch('CORE_SET_TITLE', translator.$tr('learnPageTitle'));
    },
    error => {
      handleApiError(store, error);
    }
  );
}

export function showPopularPage(store) {
  _showRecSubpage(store, _getPopular, PageNames.RECOMMENDED_POPULAR, 'popularPageTitle');
}

export function showResumePage(store) {
  _showRecSubpage(store, _getResume, PageNames.RECOMMENDED_RESUME, 'resumePageTitle');
}

export function showNextStepsPage(store) {
  _showRecSubpage(store, _getNextSteps, PageNames.RECOMMENDED_NEXT_STEPS, 'nextStepsPageTitle');
}

export function showFeaturedPage(store, channelId) {
  _showRecSubpage(
    store,
    _getFeatured,
    PageNames.RECOMMENDED_FEATURED,
    'featuredInChannelPageTitle',
    channelId
  );
}

export function showLearnContent(store, id) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.RECOMMENDED_CONTENT);
  const contentPromise = ContentNodeResource.getModel(id).fetch();
  const recommendedPromise = ContentNodeResource.getCollection({
    recommendations_for: id,
  }).fetch();
  const channelsPromise = setChannelInfo(store);
  const nextContentPromise = ContentNodeResource.fetchNextContent(id);
  ConditionalPromise.all([contentPromise, nextContentPromise, channelsPromise]).only(
    samePageCheckGenerator(store),
    ([content, nextContent]) => {
      const pageState = {
        content: contentState(content, nextContent),
        recommended: store.state.pageState.recommended,
      };
      const currentChannel = getChannelObject(store.state, content.channel_id);
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch(
        'CORE_SET_TITLE',
        translator.$tr('learnContentPageTitle', {
          currentContent: pageState.content.title,
          currentChannel: currentChannel.title,
        })
      );
    },
    error => {
      handleApiError(store, error);
    }
  );
  recommendedPromise.only(
    samePageCheckGenerator(store),
    recommended => {
      const pageState = {
        content: store.state.pageState.content,
        recommended: recommended.map(contentState),
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_ERROR', null);
    },
    error => {
      handleApiError(store, error);
    }
  );
}
