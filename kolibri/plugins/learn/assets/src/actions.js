const ContentNodeResource = require('kolibri').resources.ContentNodeResource;
const ChannelResource = require('kolibri').resources.ChannelResource;
const constants = require('./state/constants');
const PageNames = constants.PageNames;
const cookiejs = require('js-cookie');
const router = require('router');
const ConditionalPromise = require('conditionalPromise');

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
    progress = 'unstarted';
  } else if (data.progress_fraction < 1) {
    progress = 'partial';
  } else {
    progress = 'complete';
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


/*
 * Returns the promise that fetches the channel list.
 */
function _getChannelList() {
  let returnChannelList = null;
  return new Promise((resolve, reject) => {
    ChannelResource.getCollection({}).fetch()
      .then((channelList) => {
        if (channelList.length) {
          returnChannelList = channelList;
        }
        resolve(returnChannelList);
      });
  });
}


/*
 * Returns a promise that fetches the current channel id.
 */
function _getCurrentChannelId() {
  let currentChannelId = null;
  return new Promise((resolve, reject) => {
    _getChannelList()
      .then((channelList) => {
        if (channelList && channelList.length) {
          const cookieCurrentChannelId = cookiejs.get('currentChannel');
          if (channelList.some((channel) => channel.id === cookieCurrentChannelId)) {
            currentChannelId = cookieCurrentChannelId;
          } else {
            currentChannelId = channelList[0].id;
          }
        }
        resolve(currentChannelId);
      });
  });
}


/*
 * Returns a promise that fetches the the root topic id of the current channel.
 */
function _getCurrentChannelRootTopicId() {
  let currentChannelRootTopicId = null;
  return new ConditionalPromise((resolve, reject) => {
    const currentChannelIdPromise = _getCurrentChannelId();
    const channelListPromise = _getChannelList();
    Promise.all([currentChannelIdPromise, channelListPromise])
    .then(([currentChannelId, channelList]) => {
      if (currentChannelId && channelList) {
        for (const channel in channelList) {
          if (channelList[channel].id === currentChannelId) {
            currentChannelRootTopicId = channelList[channel].root_pk;
            break;
          }
        }
      }
      resolve(currentChannelRootTopicId);
    });
  });
}

/**
 * Action inhibition checks
 *
 * These generator functions produce functions that help to determine whether the
 * asynchronous outcomes of certain actions should still be applied as mutations.
 */

function checkSamePageId(store) {
  const pageId = store.state.core.pageSessionId;
  return () => store.state.core.pageSessionId === pageId;
}

/**
 * Actions
 *
 * These methods are used to update client-side state
 */


function redirectToExploreChannel(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.EXPLORE_ROOT);

  _getCurrentChannelId()
    .then((currentChannelId) => {
      store.dispatch('CORE_SET_ERROR', null);
      if (currentChannelId) {
        store.dispatch('SET_CURRENT_CHANNEL', currentChannelId);
        cookiejs.set('currentChannel', currentChannelId);
        router.go({
          name: constants.PageNames.EXPLORE_CHANNEL,
          params: {
            channel_id: currentChannelId,
          },
        });
      } else {
        router.go({ name: constants.PageNames.CONTENT_UNAVAILABLE });
      }
    })
    .catch((error) => {
      store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    });
}


function redirectToLearnChannel(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.LEARN_ROOT);

  _getCurrentChannelId()
    .then((currentChannelId) => {
      store.dispatch('CORE_SET_ERROR', null);
      if (currentChannelId) {
        store.dispatch('SET_CURRENT_CHANNEL', currentChannelId);
        cookiejs.set('currentChannel', currentChannelId);
        router.go({
          name: constants.PageNames.LEARN_CHANNEL,
          params: {
            channel_id: currentChannelId,
          },
        });
      } else {
        router.go({ name: constants.PageNames.CONTENT_UNAVAILABLE });
      }
    })
    .catch((error) => {
      store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    });
}

function showExploreChannel(store, channelId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.EXPLORE_CHANNEL);
  store.dispatch('SET_CURRENT_CHANNEL', channelId);
  cookiejs.set('currentChannel', channelId);
  ContentNodeResource.setChannel(channelId);

  _getCurrentChannelRootTopicId()
    .then((rootTopicId) => {
      store.dispatch('SET_ROOT_TOPIC_ID', rootTopicId);
      const attributesPromise = ContentNodeResource.getModel(rootTopicId).fetch();
      const childrenPromise = ContentNodeResource.getCollection({ parent: rootTopicId }).fetch();
      const channelPromise = _getChannelList();
      ConditionalPromise.all([attributesPromise, childrenPromise, channelPromise])
        .only(checkSamePageId(store), ([attributes, children, channelList]) => {
          const pageState = { rootTopicId };
          pageState.topic = _topicState(attributes);
          const collection = _collectionState(children);
          pageState.subtopics = collection.topics;
          pageState.contents = collection.contents;
          store.dispatch('SET_PAGE_STATE', pageState);
          store.dispatch('CORE_SET_PAGE_LOADING', false);
          store.dispatch('CORE_SET_ERROR', null);
          store.dispatch('SET_CHANNEL_LIST', channelList);
        });
    }, (error) => {
      store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    });
}


function showExploreTopic(store, channelId, id) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.EXPLORE_TOPIC);
  store.dispatch('SET_CURRENT_CHANNEL', channelId);
  cookiejs.set('currentChannel', channelId);

  const attributesPromise = ContentNodeResource.getModel(id).fetch();
  const childrenPromise = ContentNodeResource.getCollection({ parent: id }).fetch();
  const channelPromise = _getChannelList();
  ConditionalPromise.all([attributesPromise, childrenPromise, channelPromise])
    .only(checkSamePageId(store), ([attributes, children, channelList]) => {
      const pageState = { id };
      pageState.topic = _topicState(attributes);
      const collection = _collectionState(children);
      pageState.subtopics = collection.topics;
      pageState.contents = collection.contents;
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('SET_CHANNEL_LIST', channelList);
    }, (error) => {
      store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    });
}


function showExploreContent(store, channelId, id) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.EXPLORE_CONTENT);
  store.dispatch('SET_CURRENT_CHANNEL', channelId);
  cookiejs.set('currentChannel', channelId);

  const attributesPromise = ContentNodeResource.getModel(id).fetch();
  const channelPromise = _getChannelList();

  ConditionalPromise.all([attributesPromise, channelPromise])
    .only(checkSamePageId(store), ([attributes, channelList]) => {
      const pageState = { content: _contentState(attributes) };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('SET_CHANNEL_LIST', channelList);
    }, (error) => {
      store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    });
}


function showLearnChannel(store, channelId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.LEARN_CHANNEL);
  store.dispatch('SET_CURRENT_CHANNEL', channelId);
  cookiejs.set('currentChannel', channelId);
  ContentNodeResource.setChannel(channelId);

  const recommendedPromise =
    ContentNodeResource.getCollection({ recommendations: '' }).fetch({}, true);
  const channelPromise = _getChannelList();
  ConditionalPromise.all([recommendedPromise, channelPromise])
    .only(checkSamePageId(store), ([recommendations, channelList]) => {
      const pageState = { recommendations: recommendations.map(_contentState) };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('SET_CHANNEL_LIST', channelList);
    }, (error) => {
      store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    });
}


function showLearnContent(store, channelId, id) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.LEARN_CONTENT);
  store.dispatch('SET_CURRENT_CHANNEL', channelId);
  cookiejs.set('currentChannel', channelId);
  const attributesPromise = ContentNodeResource.getModel(id).fetch();
  const recommendedPromise = ContentNodeResource.getCollection({ recommendations_for: id }).fetch();
  const channelPromise = _getChannelList();

  ConditionalPromise.all([attributesPromise, recommendedPromise, channelPromise])
    .only(checkSamePageId(store), ([attributes, recommended, channelList]) => {
      const pageState = {
        content: _contentState(attributes),
        recommended: recommended.map(_contentState),
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('SET_CHANNEL_LIST', channelList);
    }, (error) => {
      store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    });
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
}


function showContentUnavailable(store) {
  store.dispatch('SET_PAGE_NAME', PageNames.CONTENT_UNAVAILABLE);
  store.dispatch('SET_PAGE_STATE', {});
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('CORE_SET_ERROR', null);
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
