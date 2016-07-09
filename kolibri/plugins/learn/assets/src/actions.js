const Kolibri = require('kolibri');

/**
 * Action to fetch a particular content node from the API.
 * @param {Function} dispatch - The dispatch method of the store object.
 * @param {String} id - The id of the model to be fetched.
 */
const fetchFullContent = ({ dispatch }, id) => {
  // Get the model from ContentNodeResource.
  if (typeof id === 'undefined') {
    id = 'root'; // eslint-disable-line no-param-reassign
  }
  const contentModel = Kolibri.resources.ContentNodeResource.getModel(id);
  // Check to see if it is already synced from the server.
  if (contentModel.synced) {
    // If so, immediately dispatch the mutation to set the attributes of the model into the store.
    dispatch('SET_FULL_CONTENT', contentModel.attributes);
  } else {
    // Otherwise, perform the fetch, and if the promise resolves, then call the mutation.
    contentModel.fetch().then(() => {
      dispatch('SET_FULL_CONTENT', contentModel.attributes);
    });
  }
};

/**
 * Function to dispatch mutations to topics and contents by node kind.
 * @param {Object[]} nodes - Data to dispatch mutations with.
 * @param {Function} dispatch - dispatch method of Vuex Store.
 * @param {String} topicMutation - name of mutation to dispatch topic data to.
 * @param {String} contentMutation - name of mutation to dispatch content data to.
 */
const nodeAssignment = (nodes, dispatch, topicMutation, contentMutation) => {
  const topics = nodes.filter((node) => node.kind === 'topic');
  const contents = nodes.filter((node) => node.kind !== 'topic');

  // clean up API response
  contents.forEach(content => {
    if (!content.progress) {
      content.progress = 'unstarted'; // eslint-disable-line no-param-reassign
    }
  });

  dispatch(topicMutation, topics);
  dispatch(contentMutation, contents);
};

/**
 * Action to fetch child topics of a particular topic from the API.
 * @param {Function} dispatch - The dispatch method of the store object.
 * @param {String} id - The id of the model to fetch the children of.
 */
const fetchNodes = ({ dispatch }, id) => {
  // Get the collection from ContentNodeResource.
  if (typeof id === 'undefined') {
    id = 'root'; // eslint-disable-line no-param-reassign
  }
  const contentCollection = Kolibri.resources.ContentNodeResource.getCollection({ parent: id });
  if (contentCollection.synced) {
    nodeAssignment(contentCollection.data, dispatch, 'SET_TOPICS', 'SET_CONTENTS');
  } else {
    contentCollection.fetch().then(() => {
      nodeAssignment(contentCollection.data, dispatch, 'SET_TOPICS', 'SET_CONTENTS');
    });
  }
};


const searchNodes = ({ dispatch }, params, page) => {
  // Get the collection from ContentNodeResource.
  const pageSize = 15;
  const contentCollection = Kolibri.resources.ContentNodeResource.getPagedCollection({
    search: params,
  }, {
    pageSize,
    page,
  });
  if (contentCollection.synced) {
    nodeAssignment(contentCollection.data, dispatch, 'SET_SEARCH_TOPICS', 'SET_SEARCH_CONTENTS');
    dispatch('SET_SEARCH_PAGES', contentCollection.pageCount);
    dispatch('SET_SEARCH_FINISHED', true);
  } else {
    contentCollection.fetch().then(() => {
      nodeAssignment(contentCollection.data, dispatch, 'SET_SEARCH_TOPICS', 'SET_SEARCH_CONTENTS');
      dispatch('SET_SEARCH_PAGES', contentCollection.pageCount);
      dispatch('SET_SEARCH_FINISHED', true);
    });
  }
};

const searchReset = ({ dispatch }) => {
  dispatch('SET_SEARCH_FINISHED', false);
};

const searchToggleSwitch = ({ dispatch }, params) => {
  dispatch('SET_SEARCH_TOGGLED', params);
};

module.exports = {
  fetchFullContent,
  fetchNodes,
  searchNodes,
  searchToggleSwitch,
  searchReset,
};
