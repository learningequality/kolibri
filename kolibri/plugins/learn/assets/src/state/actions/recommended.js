import {
  ContentNodeResource,
  ContentNodeProgressResource,
  SessionResource,
  UserExamResource,
  ExamLogResource,
  ExamAttemptLogResource,
} from 'kolibri.resources';

import {
  currentUserId,
  isFacilityUser,
  getCurrentChannelId,
  getCurrentChannelObject,
} from 'kolibri.coreVue.vuex.getters';

import {
  samePageCheckGenerator,
  setChannelInfo,
  handleApiError,
} from 'kolibri.coreVue.vuex.actions';

import { PageNames } from '../../constants';
import { contentState } from './main';

import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import uniqBy from 'lodash/uniqBy';
import { createTranslator } from 'kolibri.utils.i18n';

const name = 'learnerRecommendationPageTitles';

const messages = {
  popularPageTitle: 'Popular - { currentChannel }',
  resumePageTitle: 'Resume - { currentChannel }',
  nextStepsPageTitle: 'Next Steps - { currentChannel }',
  FeaturedInChannelPageTitle: 'Featured - { currentChannel }',
  learnContentPageTitle: '{ currentContent } - { currentChannel }',
};

const translator = createTranslator(name, messages);

// User-agnostic recommendations

function _getPopular(channelId) {
  const channelPayload = { channel_id: channelId };
  const popularPayload = { popular: 'true' };
  return ContentNodeResource.getCollection(channelPayload, popularPayload).fetch();
}

function _getFeatured(channelId) {
  const channelPayload = { channel_id: channelId };

  return ContentNodeResource.getAllContentCollection(channelPayload).fetch();
}

// User-specific recommendations
function _getNextSteps(channelId, state) {
  const nextStepsPayload = { next_steps: currentUserId(state) };
  const channelPayload = { channel_id: channelId };

  if (isFacilityUser(state)) {
    return ContentNodeResource.getCollection(channelPayload, nextStepsPayload).fetch();
  }
  return Promise.resolve([]);
}

function _getResume(channelId, state) {
  const resumePayload = { resume: currentUserId(state) };
  const channelPayload = { channel_id: channelId };

  if (isFacilityUser(state)) {
    return ContentNodeResource.getCollection(channelPayload, resumePayload).fetch();
  }
  return Promise.resolve([]);
}

function _mapContentSet(contentSet) {
  return uniqBy(contentSet, 'content_id').map(contentState);
}

function _showRecSubpage(store, channelId, getContentPromise, pageName, windowTitleId) {
  const state = store.state;
  // promise that resolves with content array, already mapped to state
  const pagePrep = Promise.all([
    getContentPromise(channelId, state),
    setChannelInfo(store, channelId),
    // resolves to mapped content set because then resolves to its function's return value
  ]).then(([content]) => _mapContentSet(content), error => error);

  pagePrep.then(
    recommendations => {
      const currentChannel = getCurrentChannelObject(state);
      const channelTitle = currentChannel.title;
      const recPageState = {
        recommendations,
        channelTitle,
      };
      store.dispatch('SET_PAGE_STATE', recPageState);
      store.dispatch('SET_PAGE_NAME', pageName);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);

      store.dispatch('CORE_SET_TITLE', translator.$tr(windowTitleId, { channelTitle }));
    },
    error => handleApiError(error)
  );
}

function showLearnChannel(store, channelId, cursor) {
  // Special case for when only the page number changes:
  // Don't set the 'page loading' boolean, to prevent flash and loss of keyboard focus.
  const state = store.state;
  if (state.pageName !== PageNames.LEARN_CHANNEL || getCurrentChannelId(state) !== channelId) {
    store.dispatch('CORE_SET_PAGE_LOADING', true);
  }

  const channelsPromise = setChannelInfo(store, channelId);
  channelsPromise.only(
    samePageCheckGenerator(store),
    () => {
      if (!getCurrentChannelObject(state)) {
        router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
        return;
      }
      ConditionalPromise.all([
        _getNextSteps(channelId, state),
        _getPopular(channelId),
        _getResume(channelId, state),
        _getFeatured(channelId),
      ]).only(
        samePageCheckGenerator(store),
        ([nextSteps, popular, resume, featured]) => {
          const currentChannel = getCurrentChannelObject(store.state);
          const pageState = {
            // Hard to guarantee this uniqueness on the database side, so
            // do a uniqBy content_id here, to prevent confusing repeated
            // content items.
            nextSteps: _mapContentSet(nextSteps),
            popular: _mapContentSet(popular),
            resume: _mapContentSet(resume),
            featured: _mapContentSet(featured),
            channelId: currentChannel.id,
            channelTitle: currentChannel.title,
          };
          store.dispatch('SET_PAGE_STATE', pageState);
          store.dispatch('CORE_SET_PAGE_LOADING', false);
          store.dispatch('CORE_SET_ERROR', null);
          store.dispatch('SET_PAGE_NAME', PageNames.LEARN_CHANNEL);

          store.dispatch('CORE_SET_TITLE', `Learn - ${currentChannel.title}`);
        },
        error => {
          handleApiError(store, error);
        }
      );
    },
    error => {
      handleApiError(store, error);
    }
  );
}

function showPopularPage(store, channelId) {
  _showRecSubpage(store, channelId, _getPopular, PageNames.RECOMMENDED_POPULAR, 'popularPageTitle');
}

function showResumePage(store, channelId) {
  _showRecSubpage(store, channelId, _getResume, PageNames.RECOMMENDED_RESUME, 'resumePageTitle');
}

function showNextStepsPage(store, channelId) {
  _showRecSubpage(
    store,
    channelId,
    _getNextSteps,
    PageNames.RECOMMENDED_NEXT_STEPS,
    'nextStepsPageTitle'
  );
}

function showFeaturedPage(store, channelId) {
  _showRecSubpage(
    store,
    channelId,
    _getFeatured,
    PageNames.RECOMMENDED_FEATURED,
    'featuredInChannelPageTitle'
  );
}

function showLearnContent(store, channelId, id) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.LEARN_CONTENT);
  const channelPayload = { channel_id: channelId };
  const contentPromise = ContentNodeResource.getModel(id, channelPayload).fetch();
  const recommendedPromise = ContentNodeResource.getCollection(channelPayload, {
    recommendations_for: id,
  }).fetch();
  const channelsPromise = setChannelInfo(store, channelId);
  const nextContentPromise = ContentNodeResource.fetchNextContent(id, {
    channel_id: channelId,
  });
  ConditionalPromise.all([contentPromise, channelsPromise, nextContentPromise]).only(
    samePageCheckGenerator(store),
    ([content, channels, nextContent]) => {
      const currentChannel = getCurrentChannelObject(store.state);
      if (!currentChannel) {
        router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
        return;
      }
      const pageState = {
        content: contentState(content, nextContent),
        recommended: store.state.pageState.recommended,
      };
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

export {
  showLearnChannel,
  showPopularPage,
  showNextStepsPage,
  showResumePage,
  showFeaturedPage,
  showLearnContent,
};
