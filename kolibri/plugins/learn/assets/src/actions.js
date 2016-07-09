const Resources = require('kolibri').resources.ContentNodeResource;
const constants = require('./state/constants');

const PageNames = constants.PageNames;


function _crumbState(ancestors) {
  return ancestors.map((ancestor, index) => {
    if (index === 0) {
      return { id: 'root', title: 'Home' }; // TODO - I18N
    }
    return {
      id: ancestor.pk,
      title: ancestor.title,
    };
  });
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
    files: data.files,
    progress: data.progress ? data.progress : 'unstarted',
    breadcrumbs: _crumbState(data.ancestors),
  };
  return state;
}

function showExploreTopic(store, id) {
  store.dispatch('SET_LOADING');
  store.dispatch('SET_PAGE_NAME', PageNames.EXPLORE_ROOT);

  const attributesPromise = Resources.getModel(id).fetch();
  const childrenPromise = Resources.getCollection({ parent: id }).fetch();

  Promise.all([attributesPromise, childrenPromise])
    .then(([attributes, children]) => {
      const pageState = { id };
      pageState.topic = _topicState(attributes);
      pageState.subtopics = children
        .filter((item) => item.kind === 'topic')
        .map((item) => _topicState(item));
      pageState.contents = children
        .filter((item) => item.kind !== 'topic')
        .map((item) => _contentState(item));
      store.dispatch('SET_PAGE_STATE', pageState);
    })
    .catch((error) => {
      // TODO - how to parse and format?
      store.dispatch('SET_PAGE_ERROR', JSON.stringify(error, null, '\t'));
    });
}

function showLearnRoot(store) {
  store.dispatch('SET_PAGE_NAME', PageNames.LEARN_ROOT);
  store.dispatch('SET_PAGE_STATE', {}); // TODO
}

function temp(store, toRoute, fromRoute) {
  console.log(store, toRoute, fromRoute);
}


module.exports = {
  showExploreTopic,
  showLearnRoot,
  temp,
};
