import { ContentNodeResource } from 'kolibri.resources';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import uniqBy from 'lodash/uniqBy';
import { createTranslator } from 'kolibri.utils.i18n';
import { PageNames } from '../../constants';
import { contentState, setAndCheckChannels } from './main';

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
  return ContentNodeResource.getCollection({ popular: 'true', by_role: true }).fetch();
}

function _getFeatured(state, channelId) {
  return ContentNodeResource.getAllContentCollection({
    channel_id: channelId,
    by_role: true,
  }).fetch();
}

// User-specific recommendations
function _getNextSteps(store) {
  if (store.getters.isUserLoggedIn) {
    return ContentNodeResource.getCollection({
      next_steps: store.getters.currentUserId,
      by_role: true,
    }).fetch();
  }
  return Promise.resolve([]);
}

function _getResume(store) {
  if (store.getters.isUserLoggedIn) {
    return ContentNodeResource.getCollection({
      resume: store.getters.currentUserId,
      by_role: true,
    }).fetch();
  }
  return Promise.resolve([]);
}

function _mapContentSet(contentSet) {
  return uniqBy(contentSet, 'content_id').map(contentState);
}

function _showRecSubpage(store, getContentPromise, pageName, windowTitleId, channelId = null) {
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
      let pageTitle;
      if (channelId) {
        const currentChannel = store.getters.getChannelObject(channelId);
        const channelTitle = currentChannel.title;
        recPageState.channelTitle = channelTitle;
        pageTitle = translator.$tr(windowTitleId, { currentChannel: channelTitle });
      } else {
        pageTitle = translator.$tr(windowTitleId);
      }
      store.commit('SET_PAGE_STATE', recPageState);
      store.commit('SET_PAGE_NAME', pageName);
      store.commit('CORE_SET_PAGE_LOADING', false);
      store.commit('CORE_SET_ERROR', null);
      store.commit('CORE_SET_TITLE', pageTitle);
    },
    error => store.dispatch('handleApiError', error)
  );
}

export function showLearn(store) {
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

      store.commit('SET_PAGE_STATE', pageState);

      featuredChannels.forEach(channel => {
        _getFeatured(state, channel.id).only(samePageCheckGenerator(store), featured => {
          store.commit('SET_FEATURED_CHANNEL_CONTENTS', {
            channelId: channel.id,
            contents: _mapContentSet(featured),
          });
        });
      });

      store.commit('CORE_SET_PAGE_LOADING', false);
      store.commit('CORE_SET_ERROR', null);
      store.commit('SET_PAGE_NAME', PageNames.RECOMMENDED);

      store.commit('CORE_SET_TITLE', translator.$tr('learnPageTitle'));
    },
    error => {
      store.dispatch('handleApiError', error);
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
  store.commit('CORE_SET_PAGE_LOADING', true);
  store.commit('SET_PAGE_NAME', PageNames.RECOMMENDED_CONTENT);
  const promises = [
    ContentNodeResource.getModel(id).fetch(),
    ContentNodeResource.fetchNextContent(id),
    store.dispatch('setChannelInfo'),
  ];
  const recommendedPromise = ContentNodeResource.getCollection({
    recommendations_for: id,
    by_role: true,
  }).fetch();
  ConditionalPromise.all(promises).only(
    samePageCheckGenerator(store),
    ([content, nextContent]) => {
      const pageState = {
        content: contentState(content, nextContent),
        recommended: store.state.pageState.recommended,
      };
      const currentChannel = store.getters.getChannelObject(content.channel_id);
      store.commit('SET_PAGE_STATE', pageState);
      store.commit('CORE_SET_PAGE_LOADING', false);
      store.commit('CORE_SET_ERROR', null);
      store.commit(
        'CORE_SET_TITLE',
        translator.$tr('learnContentPageTitle', {
          currentContent: pageState.content.title,
          currentChannel: currentChannel.title,
        })
      );
    },
    error => {
      store.dispatch('handleApiError', error);
    }
  );
  recommendedPromise.only(
    samePageCheckGenerator(store),
    recommended => {
      store.commit('SET_PAGE_STATE', {
        content: store.state.pageState.content,
        recommended: recommended.map(contentState),
      });
      store.commit('CORE_SET_ERROR', null);
    },
    error => {
      store.dispatch('handleApiError', error);
    }
  );
}
