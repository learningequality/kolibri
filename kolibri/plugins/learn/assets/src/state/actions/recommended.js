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
import { _contentState } from './main';

import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import uniqBy from 'lodash/uniqBy';

function _fetchPopular(channelId) {
  const channelPayload = { channel_id: channelId };
  const popularPayload = { popular: 'true' };
  return ContentNodeResource.getCollection(channelPayload, popularPayload).fetch();
}

function _fetchNextSteps(channelId, state) {
  const nextStepsPayload = { next_steps: currentUserId(state) };
  const channelPayload = { channel_id: channelId };

  if (isFacilityUser(state)) {
    return ContentNodeResource.getCollection(channelPayload, nextStepsPayload).fetch();
  }
  return Promise.resolve([]);
}

function _fetchResume(channelId, state) {
  const resumePayload = { resume: currentUserId(state) };
  const channelPayload = { channel_id: channelId };

  // all you really need is user_id. Should we check in parent?
  if (isFacilityUser(state)) {
    return ContentNodeResource.getCollection(channelPayload, resumePayload).fetch();
  }
  return Promise.resolve([]);
}

function _fetchOverview(channelId, cursor) {
  const channelPayload = { channel_id: channelId };

  return ContentNodeResource.getAllContentCollection(channelPayload, { cursor }).fetch();
}

function showLearnChannel(store, channelId, cursor) {
  // Special case for when only the page number changes:
  // Don't set the 'page loading' boolean, to prevent flash and loss of keyboard focus.
  const state = store.state;
  if (state.pageName !== PageNames.LEARN_CHANNEL || getCurrentChannelId(state) !== channelId) {
    store.dispatch('CORE_SET_PAGE_LOADING', true);
  }

  // session should already be set by app.js
  // const sessionPromise = SessionResource.getModel('current').fetch();
  // do we really need to set the channel first?
  // ConditionalPromise.all([sessionPromise, channelsPromise]).only(
  const channelsPromise = setChannelInfo(store, channelId);
  channelsPromise.only(
    samePageCheckGenerator(store),
    () => {
      // IDEA learn page checker
      if (!getCurrentChannelObject(state)) {
        router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
        return;
      }
      ConditionalPromise.all([
        _fetchNextSteps(channelId, state),
        _fetchPopular(channelId),
        _fetchResume(channelId, state),
        _fetchOverview(channelId, cursor),
      ]).only(
        samePageCheckGenerator(store), //QUESTION when would this check every be false?
        ([nextSteps, popular, resume, overview]) => {
          const currentChannel = getCurrentChannelObject(store.state);
          const pageState = {
            // Hard to guarantee this uniqueness on the database side, so
            // do a uniqBy content_id here, to prevent confusing repeated
            // content items.
            nextSteps: uniqBy(nextSteps, 'content_id').map(_contentState),
            popular: uniqBy(popular, 'content_id').map(_contentState),
            resume: uniqBy(resume, 'content_id').map(_contentState),
            overview: overview.map(_contentState),
            channelId: currentChannel.id,
            // next: allContentCollection.next,
            // previous: allContentCollection.previous,
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
  const state = store.state;

  const getPopular = new Promise((resolve, reject) => {
    const comingFromLearn = state.pageName === PageNames.LEARN_CHANNEL;
    const channelChanged = getCurrentChannelId(state) !== channelId;

    if (!comingFromLearn || channelChanged) {
      store.dispatch('CORE_SET_PAGE_LOADING', true);

      setChannelInfo(store, channelId).then(
        () => {
          _fetchPopular(channelId).then(popularContent => {
            resolve(uniqBy(popularContent, 'content_id').map(_contentState));
          });
        },
        error => reject(error)
      );
    } else {
      // just get the data that was already in the page state
      resolve(state.pageState.popular);
    }
  });

  // avoided conditional promise using new promise
  getPopular.then(
    popularContent => {
      const popularPageState = {
        recommendations: popularContent,
      };
      store.dispatch('SET_PAGE_STATE', popularPageState);
      store.dispatch('SET_PAGE_NAME', PageNames.RECOMMENDED_POPULAR);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);

      const currentChannel = getCurrentChannelObject(state);
      store.dispatch('CORE_SET_TITLE', `Popular - ${currentChannel.title}`);
    },
    error => handleApiError(error)
  );
}

function showResumePage(store, channelId) {
  const state = store.state;
  // avoided conditional promise using new promise
  _fetchResume(channelId, state).then(
    resumeContent => {
      const resumePageState = {
        recommendations: uniqBy(resumeContent, 'content_id').map(_contentState),
      };
      store.dispatch('SET_PAGE_STATE', resumePageState);
      store.dispatch('SET_PAGE_NAME', PageNames.RECOMMENDED_RESUME);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);

      const currentChannel = getCurrentChannelObject(state);
      store.dispatch('CORE_SET_TITLE', `Resume - ${currentChannel.title}`);
    },
    error => handleApiError(error)
  );
}

function showNextStepsPage(store, channelId) {
  const state = store.state;
  // avoided conditional promise using new promise
  _fetchNextSteps(channelId, state).then(
    nextStepsContent => {
      const nextStepsPageState = {
        recommendations: uniqBy(nextStepsContent, 'content_id').map(_contentState),
      };
      store.dispatch('SET_PAGE_STATE', nextStepsPageState);
      store.dispatch('SET_PAGE_NAME', PageNames.RECOMMENDED_NEXT_STEPS);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);

      const currentChannel = getCurrentChannelObject(state);
      store.dispatch('CORE_SET_TITLE', `Next Steps - ${currentChannel.title}`);
    },
    error => handleApiError(error)
  );
}

function showOverviewPage(store, channelId) {
  const state = store.state;
  // avoided conditional promise using new promise
  _fetchOverview(channelId).then(
    overviewContent => {
      const overviewPageState = {
        recommendations: uniqBy(overviewContent, 'content_id').map(_contentState),
      };
      store.dispatch('SET_PAGE_STATE', overviewPageState);
      store.dispatch('SET_PAGE_NAME', PageNames.RECOMMENDED_OVERVIEW);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);

      const currentChannel = getCurrentChannelObject(state);
      store.dispatch('CORE_SET_TITLE', `Overview - ${currentChannel.title}`);
    },
    error => handleApiError(error)
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
        content: _contentState(content, nextContent),
        recommended: store.state.pageState.recommended,
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_TITLE', `${pageState.content.title} - ${currentChannel.title}`);
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
        recommended: recommended.map(_contentState),
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
  showOverviewPage,
  showLearnContent,
};
