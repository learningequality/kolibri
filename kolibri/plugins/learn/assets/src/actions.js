const Resources = require('kolibri').resources.ContentNodeResource;
const constants = require('./state/constants');

const PageNames = constants.PageNames;


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
  const state = {
    id: data.pk,
    title: data.title,
    kind: data.kind,
    description: data.description,
    thumbnail: data.thumbnail,
    available: data.available,
    files: data.files,
    progress: data.progress ? data.progress : 'unstarted',
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


/**
 * Actions
 *
 * These methods are used to update client-side state
 */

function showExploreTopic(store, id, channelId) {
  store.dispatch('SET_PAGE_LOADING');
  store.dispatch('SET_PAGE_NAME', PageNames.EXPLORE_ROOT);

  const attributesPromise = Resources.getModel(id).fetch();
  const childrenPromise = Resources.getCollection({ parent: id }).fetch();

  Promise.all([attributesPromise, childrenPromise])
    .then(([attributes, children]) => {
      const pageState = { id };
      pageState.topic = _topicState(attributes);
      const collection = _collectionState(children);
      pageState.subtopics = collection.topics;
      pageState.contents = collection.contents;
      pageState.currentChannelId = channelId;
      store.dispatch('SET_PAGE_STATE', pageState);
    })
    .catch((error) => {
      store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
    });
}


function showExploreContent(store, id, channelId) {
  store.dispatch('SET_PAGE_LOADING');
  store.dispatch('SET_PAGE_NAME', PageNames.EXPLORE_CONTENT);

  Resources.getModel(id).fetch()
    .then((attributes) => {
      const pageState = { content: _contentState(attributes) };
      pageState.currentChannelId = channelId;
      store.dispatch('SET_PAGE_STATE', pageState);
    })
    .catch((error) => {
      store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
    });
}


function showLearnRoot(store, channelId) {
  store.dispatch('SET_PAGE_LOADING');
  store.dispatch('SET_PAGE_NAME', PageNames.LEARN_ROOT);

  Resources.getCollection({ recommendations: '' }).fetch()
    .then((recommendations) => {
      const pageState = { recommendations: recommendations.map(_contentState) };
      pageState.currentChannelId = channelId;
      store.dispatch('SET_PAGE_STATE', pageState);
    })
    .catch((error) => {
      store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
    });
}


function showLearnContent(store, id, channelId) {
  store.dispatch('SET_PAGE_LOADING');
  store.dispatch('SET_PAGE_NAME', PageNames.LEARN_CONTENT);

  const attributesPromise = Resources.getModel(id).fetch();
  const recommendedPromise = Resources.getCollection({ recommendations_for: id }).fetch();

  Promise.all([attributesPromise, recommendedPromise])
    .then(([attributes, recommended]) => {
      const pageState = {
        content: _contentState(attributes),
        recommended: recommended.map(_contentState),
      };
      pageState.currentChannelId = channelId;
      store.dispatch('SET_PAGE_STATE', pageState);
    })
    .catch((error) => {
      store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
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

  const contentCollection = Resources.getPagedCollection({ search: searchTerm });
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
    store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
  });
}


function toggleSearch(store) {
  store.dispatch('TOGGLE_SEARCH');
}


function showScratchpad(store) {
  store.dispatch('SET_PAGE_NAME', PageNames.SCRATCHPAD);
  store.dispatch('SET_PAGE_STATE', {});
}


module.exports = {
  showExploreTopic,
  showExploreContent,
  showLearnRoot,
  showLearnContent,
  showScratchpad,
  triggerSearch,
  toggleSearch,
};
