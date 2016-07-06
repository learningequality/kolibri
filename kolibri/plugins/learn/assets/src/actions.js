const Kolibri = require('kolibri');

/**
 * Action to fetch a particular content node from the API.
 * @param {Function} dispatch - The dispatch method of the store object.
 * @param {String} id - The id of the model to be fetched.
 */
const fetchFullContent = ({ dispatch }, id) => {
  // Get the model from ContentNodeResource.
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
 */
const nodeAssignment = (nodes, dispatch) => {
  const topics = nodes.filter((node) => node.kind === 'topic');
  const contents = nodes.filter((node) => node.kind !== 'topic');
  dispatch('SET_TOPICS', topics);
  dispatch('SET_CONTENTS', contents);
};

/**
 * Action to fetch child topics of a particular topic from the API.
 * @param {Function} dispatch - The dispatch method of the store object.
 * @param {String} id - The id of the model to fetch the children of.
 */
const fetchNodes = ({ dispatch }, id) => {
  if (id === undefined) {
    // root node
    nodeAssignment(global.bootstrappedTopics, dispatch);
    return;
  }

  // Get the collection from ContentNodeResource.
  const contentCollection = Kolibri.resources.ContentNodeResource.getCollection({ parent: id });
  if (contentCollection.synced) {
    nodeAssignment(contentCollection.data, dispatch);
  } else {
    contentCollection.fetch().then(() => {
      nodeAssignment(contentCollection.data, dispatch);
    });
  }
};

module.exports = {
  fetchFullContent,
  fetchNodes,
};
