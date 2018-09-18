import {
  ContentNodeResource,
  ContentNodeSlimResource,
  ContentNodeProgressResource,
} from 'kolibri.resources';
import {
  currentUserId,
  getChannelObject,
  isUserLoggedIn,
  isCoach,
  isAdmin,
} from 'kolibri.coreVue.vuex.getters';
import {
  samePageCheckGenerator,
  setChannelInfo,
  handleApiError,
} from 'kolibri.coreVue.vuex.actions';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import uniq from 'lodash/uniq';
import uniqBy from 'lodash/uniqBy';
import { createTranslator } from 'kolibri.utils.i18n';
import { PageNames } from '../../constants';
import { contentState, setAndCheckChannels } from './main';

const translator = createTranslator('learnerRecommendationPageTitles', {
  popularPageTitle: 'Popular',
  resumePageTitle: 'Resume',
  nextStepsPageTitle: 'Next Steps',
  learnContentPageTitle: '{ currentContent } - { currentChannel }',
  learnPageTitle: 'Learn',
});

// User-agnostic recommendations
function _getPopular(state) {
  const include_fields = [];
  if (isCoach(state) || isAdmin(state)) {
    include_fields.push('num_coach_contents');
  }
  return ContentNodeSlimResource.getCollection({
    popular: 'true',
    by_role: true,
    include_fields,
  }).fetch();
}

// User-specific recommendations
function _getNextSteps(state) {
  if (isUserLoggedIn(state)) {
    const include_fields = [];
    if (isCoach(state) || isAdmin(state)) {
      include_fields.push('num_coach_contents');
    }
    return ContentNodeSlimResource.getCollection({
      next_steps: currentUserId(state),
      by_role: true,
      include_fields,
    }).fetch();
  }
  return Promise.resolve([]);
}

function _getResume(state) {
  if (isUserLoggedIn(state)) {
    const include_fields = [];
    if (isCoach(state) || isAdmin(state)) {
      include_fields.push('num_coach_contents');
    }
    return ContentNodeSlimResource.getCollection({
      resume: currentUserId(state),
      by_role: true,
      include_fields,
    }).fetch();
  }
  return Promise.resolve([]);
}

function _mapContentSet(contentSet) {
  return uniqBy(contentSet, 'content_id').map(contentState);
}

function _showRecSubpage(store, getContentPromise, pageName, windowTitleId, channelId = null) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
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
    _getPopular(state),
    _getResume(state),
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

      store.dispatch('SET_PAGE_STATE', pageState);

      // Only load contentnodes progress if the user is logged in
      if (isUserLoggedIn(store.state)) {
        const contentNodeIds = uniq([...nextSteps, ...popular, ...resume].map(({ id }) => id));

        if (contentNodeIds.length > 0) {
          ContentNodeProgressResource.getCollection({ ids: contentNodeIds })
            .fetch()
            .then(progresses => {
              store.dispatch('SET_RECOMMENDED_NODES_PROGRESS', progresses);
            });
        }
      }

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

export function showLearnContent(store, id) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.RECOMMENDED_CONTENT);
  const promises = [
    ContentNodeResource.getModel(id).fetch(),
    ContentNodeResource.fetchNextContent(id),
    setChannelInfo(store),
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
      store.dispatch('SET_PAGE_STATE', {
        content: store.state.pageState.content,
        recommended: recommended.map(contentState),
      });
      store.dispatch('CORE_SET_ERROR', null);
    },
    error => {
      handleApiError(store, error);
    }
  );
}
