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
 * Action to fetch child topics of a particular topic from the API.
 * @param {Function} dispatch - The dispatch method of the store object.
 * @param {String} id - The id of the model to fetch the children of.
 */
const fetchNodes = ({ dispatch }, id) => {
  // Get the collection from ContentNodeResource.
  const contentCollection = Kolibri.resources.ContentNodeResource.getCollection();
  contentCollection.fetch({ parent: id }).then((nodes) => {
    const topics = nodes.filter((node) => node.kind === 'topic');
    const contents = nodes.filter((node) => node.kind !== 'topic');
    dispatch('SET_TOPICS', topics);
    dispatch('SET_CONTENTS', contents);
  });
};

module.exports = {
  fetchFullContent,
  fetchNodes,
};
