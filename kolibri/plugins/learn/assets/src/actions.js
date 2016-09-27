const ContentNodeResource = require('kolibri').resources.ContentNodeResource;
const ChannelResource = require('kolibri').resources.ChannelResource;
const SessionResource = require('kolibri').resources.SessionResource;
const constants = require('./state/constants');
const getters = require('./state/getters');
const PageNames = constants.PageNames;
const cookiejs = require('js-cookie');
const router = require('kolibri/coreVue/router');
const ConditionalPromise = require('kolibri/lib/conditionalPromise');
const samePageCheckGenerator = require('kolibri/coreVue/vuex/actions').samePageCheckGenerator;

/**
 * Vuex State Mappers
 *
 * The methods below help map data from
 * the API to state in the Vuex store
 */

function _crumbState(ancestors) {
  // skip the root node
  return ancestors.slice(1).map(ancestor => ({
    id: ancestor.pk,
    title: ancestor.title,
  }));
}


function _topicState(data) {
  const state = {
    id: data.pk,
    title: data.title,
    description: data.description,
    breadcrumbs: _crumbState(data.ancestors),
  };
  return state;
}


function _contentState(data) {
  let progress;
  if (!data.progress_fraction) {
    progress = 0.0;
  } else if (data.progress_fraction > 1.0) {
    progress = 1.0;
  } else {
    progress = data.progress_fraction;
  }
  const state = {
    id: data.pk,
    title: data.title,
    kind: data.kind,
    description: data.description,
    thumbnail: data.thumbnail,
    available: data.available,
    files: data.files,
    progress,
    content_id: data.content_id,
    breadcrumbs: _crumbState(data.ancestors),
  };
  return state;
}


function _collectionState(data) {
  const topics = data
    .filter((item) => item.kind === 'topic')
    .map((item) => _topicState(item));
  const contents = data
    .filter((item) => item.kind !== 'topic')
    .map((item) => _contentState(item));
  return { topics, contents };
}


function _channelListState(data) {
  return data.map(channel => ({
    id: channel.id,
    title: channel.name,
    description: channel.description,
    root_id: channel.root_pk,
  }));
}


/**
 * Title Helpers
 */

function _explorePageTitle(title) {
  if (title) {
    return `Explore - ${title}`;
  }
  return 'Explore';
}

function _learnPageTitle(title) {
  if (title) {
    return `Learn - ${title}`;
  }
  return 'Learn';
}

function _errorTitle(title) {
  if (title) {
    return `Error - ${title}`;
  }
  return 'Error';
}


/*
 * Returns the 'default' channel ID:
 * - if there are channels and they match the cookie, return that
 * - else if there are channels, return the first one
 * - else return null
 */
function _getDefaultChannelId(store, channelList) {
  if (channelList && channelList.length) {
    const cookieVal = cookiejs.get('currentChannelId');
    if (channelList.some((channel) => channel.id === cookieVal)) {
      return cookieVal;
    }
    return channelList[0].id;
  }
  return null;
}


/*
 * Set channel state info.
 * Returns `true` if the requested channel ID is available in the list.
 */
function _handleChannels(store, currentChannelId, channelList) {
  store.dispatch('SET_CHANNEL_LIST', channelList);
  store.dispatch('SET_CURRENT_CHANNEL', currentChannelId);
  ContentNodeResource.setChannel(currentChannelId);
  cookiejs.set('currentChannelId', currentChannelId);

  if (!channelList.find(channel => channel.id === currentChannelId)) {
    store.dispatch('CORE_SET_ERROR', 'Channel not found');
    store.dispatch('CORE_SET_PAGE_LOADING', false);
    document.title = _errorTitle();
    return false;
  }
  return true;
}


/**
 * Actions
 *
 * These methods are used to update client-side state
 */

function redirectToExploreChannel(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.EXPLORE_ROOT);

  ChannelResource.getCollection({}).fetch().then(
    (channelsData) => {
      const channelList = _channelListState(channelsData);
      const channelId = _getDefaultChannelId(store, channelList);
      _handleChannels(store, channelId, channelList);
      if (channelList.length) {
        router.replace({
          name: constants.PageNames.EXPLORE_CHANNEL,
          params: { channel_id: channelId },
        });
      } else {
        router.replace({ name: constants.PageNames.CONTENT_UNAVAILABLE });
      }
    },
    (error) => {
      store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      document.title = _errorTitle();
    }
  );
}


function redirectToLearnChannel(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.LEARN_ROOT);

  ChannelResource.getCollection({}).fetch().then(
    (channelsData) => {
      const channelList = _channelListState(channelsData);
      const channelId = _getDefaultChannelId(store, channelList);
      _handleChannels(store, channelId, channelList);
      if (channelList.length) {
        router.replace({
          name: constants.PageNames.LEARN_CHANNEL,
          params: { channel_id: channelId },
        });
      } else {
        router.replace({ name: constants.PageNames.CONTENT_UNAVAILABLE });
      }
    },
    (error) => {
      store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      document.title = _errorTitle();
    }
  );
}


function showExploreTopic(store, channelId, id, customTitle) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.EXPLORE_TOPIC);

  const topicPromise = ContentNodeResource.getModel(id).fetch();
  const childrenPromise = ContentNodeResource.getCollection({ parent: id }).fetch();
  const channelsPromise = ChannelResource.getCollection({}).fetch();
  ConditionalPromise.all([topicPromise, childrenPromise, channelsPromise]).only(
    samePageCheckGenerator(store),
    ([topic, children, channelsData]) => {
      if (!_handleChannels(store, channelId, _channelListState(channelsData))) {
        return;
      }
      const pageState = {};
      pageState.topic = _topicState(topic);
      const collection = _collectionState(children);
      pageState.subtopics = collection.topics;
      pageState.contents = collection.contents;
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      if (customTitle) {
        document.title = _explorePageTitle(customTitle);
      } else {
        document.title = _explorePageTitle(pageState.topic.title);
      }
    },
    (error) => {
      store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      document.title = _errorTitle();
    }
  );
}


function showExploreChannel(store, channelId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.EXPLORE_CHANNEL);

  ChannelResource.getCollection({}).fetch().then(
    (channelsData) => {
      if (!_handleChannels(store, channelId, _channelListState(channelsData))) {
        return;
      }
      const currentChannel = getters.currentChannel(store.state);
      store.dispatch('SET_ROOT_TOPIC_ID', currentChannel.root_id);
      showExploreTopic(store, channelId, currentChannel.root_id, currentChannel.title);
    }
  );
}


function showExploreContent(store, channelId, id) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.EXPLORE_CONTENT);

  const contentPromise = ContentNodeResource.getModel(id).fetch();
  const channelsPromise = ChannelResource.getCollection({}).fetch();
  ConditionalPromise.all([contentPromise, channelsPromise]).only(
    samePageCheckGenerator(store),
    ([content, channelsData]) => {
      if (!_handleChannels(store, channelId, _channelListState(channelsData))) {
        return;
      }
      const pageState = { content: _contentState(content) };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      document.title = _explorePageTitle(pageState.content.title);
    },
    (error) => {
      store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      document.title = _errorTitle();
    }
  );
}


function showLearnChannel(store, channelId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.LEARN_CHANNEL);

  const sessionPromise = SessionResource.getModel('current').fetch();
  const channelsPromise = ChannelResource.getCollection({}).fetch();
  ConditionalPromise.all([sessionPromise, channelsPromise]).only(
    samePageCheckGenerator(store),
    ([session, channelsData]) => {
      if (!_handleChannels(store, channelId, _channelListState(channelsData))) {
        return;
      }
      const nextStepsPayload = { next_steps: session.user_id, channel: channelId };
      const popularPayload = { popular: session.user_id, channel: channelId };
      const resumePayload = { resume: session.user_id, channel: channelId };
      const nextStepsPromise = ContentNodeResource.getCollection(nextStepsPayload).fetch();
      const popularPromise = ContentNodeResource.getCollection(popularPayload).fetch();
      const resumePromise = ContentNodeResource.getCollection(resumePayload).fetch();
      ConditionalPromise.all([nextStepsPromise, popularPromise, resumePromise]).only(
        samePageCheckGenerator(store),
        ([nextSteps, popular, resume, channelList]) => {
          const pageState = { recommendations: { nextSteps: nextSteps.map(_contentState),
                                                 popular: popular.map(_contentState),
                                                 resume: resume.map(_contentState) } };
          store.dispatch('SET_PAGE_STATE', pageState);
          store.dispatch('CORE_SET_PAGE_LOADING', false);
          store.dispatch('CORE_SET_ERROR', null);
          const currentChannel = getters.currentChannel(store.state);
          document.title = _learnPageTitle(currentChannel.title);
        },
        (error) => {
          store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
          store.dispatch('CORE_SET_PAGE_LOADING', false);
          document.title = _errorTitle();
        }
      );
    },
    (error) => {
      store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      document.title = _errorTitle();
    }
  );
}


function showLearnContent(store, channelId, id) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.LEARN_CONTENT);
  const contentPromise = ContentNodeResource.getModel(id).fetch();
  const recommendedPromise = ContentNodeResource.getCollection({ recommendations_for: id }).fetch();
  const channelsPromise = ChannelResource.getCollection({}).fetch();
  ConditionalPromise.all([contentPromise, channelsPromise]).only(
    samePageCheckGenerator(store),
    ([content, channelsData]) => {
      if (!_handleChannels(store, channelId, _channelListState(channelsData))) {
        return;
      }
      const pageState = {
        content: _contentState(content),
        recommended: store.state.pageState.recommended,
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      document.title = _learnPageTitle(pageState.content.title);
    },
    (error) => {
      store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      document.title = _errorTitle();
    }
  );
  recommendedPromise.only(
    samePageCheckGenerator(store),
    (recommended) => {
      const pageState = {
        content: store.state.pageState.content,
        recommended: recommended.map(_contentState),
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
    },
    (error) => {
      store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      document.title = _errorTitle();
    }
  );
}


function triggerSearch(store, searchTerm) {
  if (!searchTerm) {
    const searchState = {
      searchTerm,
      topics: [],
      contents: [],
    };
    store.dispatch('SET_SEARCH_STATE', searchState);
    return;
  }

  store.dispatch('SET_SEARCH_LOADING');

  const contentCollection = ContentNodeResource.getPagedCollection({ search: searchTerm });
  const searchResultsPromise = contentCollection.fetch();

  searchResultsPromise.then((results) => {
    const searchState = { searchTerm };
    const collection = _collectionState(results);
    searchState.topics = collection.topics;
    searchState.contents = collection.contents;
    store.dispatch('SET_SEARCH_STATE', searchState);
  })
    .catch((error) => {
      // TODO - how to parse and format?
      store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
    });
}

function clearSearch(store) {
  store.dispatch('SET_SEARCH_STATE', {
    topics: [],
    contents: [],
    searchTerm: '',
  });
}

function toggleSearch(store) {
  store.dispatch('TOGGLE_SEARCH');
}


function showScratchpad(store) {
  store.dispatch('SET_PAGE_NAME', PageNames.SCRATCHPAD);
  store.dispatch('SET_PAGE_STATE', {});
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('CORE_SET_ERROR', null);
  document.title = 'Scratchpad';
}


function showContentUnavailable(store) {
  store.dispatch('SET_PAGE_NAME', PageNames.CONTENT_UNAVAILABLE);
  store.dispatch('SET_PAGE_STATE', {});
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('CORE_SET_ERROR', null);
  document.title = 'Content Unavailable';
}


module.exports = {
  redirectToExploreChannel,
  redirectToLearnChannel,
  showExploreChannel,
  showExploreTopic,
  showExploreContent,
  showLearnChannel,
  showLearnContent,
  showScratchpad,
  showContentUnavailable,
  triggerSearch,
  toggleSearch,
  clearSearch,
};
