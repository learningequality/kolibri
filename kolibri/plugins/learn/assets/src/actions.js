const Resources = require('kolibri').resources.ContentNodeResource;
const constants = require('./constants');

const PageModes = constants.PageModes;
const PageNames = constants.PageNames;

const router = require('./router');


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

function _topicState(data, includeCrumbs = true) {
  const state = {
    id: data.pk,
    title: data.title,
    description: data.description,
  };
  if (includeCrumbs) {
    state.breadcrumbs = _crumbState(data.ancestors);
  }
  return state;
}

function _contentState(data, includeCrumbs = true) {
  const state = {
    id: data.pk,
    title: data.title,
    description: data.description,
    thumbnail: data.thumbnail,
    files: data.files,
    progress: data.description ? data.description : 'unstarted',
  };
  if (includeCrumbs) {
    state.breadcrumbs = _crumbState(data.ancestors);
  }
  return state;
}

function navToExploreTopic(store, id) {
  store.dispatch('SET_PAGE_NAME', PageNames.EXPLORE_ROOT);
  store.dispatch('SET_PAGE_MODE', PageModes.EXPLORE);
  store.dispatch('SET_LOADING');

  const pageState = { id };

  Resources.getModel(id).fetch()
    .then((data) => {
      // check if somehow we're on the wrong type
      if (data.kind !== 'topic') {
        router.go(PageNames.EXPLORE_CONTENT, { id });
        return Promise.reject();
      }
      pageState.topic = _topicState(data);
      return Resources.getCollection({ parent: id });
    })
    .then((topicChildren) => {
      pageState.subtopics = topicChildren
        .filter((item) => item.kind === 'topic')
        .map((data) => _topicState(data, false));
      pageState.contents = topicChildren
        .filter((item) => item.kind !== 'topic')
        .map((data) => _contentState(data, false));

      store.dispatch('SET_PAGE_STATE', pageState);
    })
    .catch((error) => {
      // TODO - how to parse and format?
      store.dispatch('SET_PAGE_ERROR', JSON.stringify(error, null, '\t'));
    });
}

function navToLearnRoot(store, toRoute, fromRoute) {
  store.dispatch('SET_PAGE', PageNames.LEARN_ROOT, PageModes.LEARN);
}

function temp(store, toRoute, fromRoute) {
  console.log(store, toRoute, fromRoute);
}


module.exports = {
  navToExploreTopic,
  navToLearnRoot,
  temp,
};
