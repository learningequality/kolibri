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

const searchNodes = ({ dispatch }, params) => {
  // Get the collection from ContentNodeResource.
  const contentCollection = Kolibri.resources.ContentNodeResource.getCollection();
  const wantedFields = ['pk', 'title', 'kind', 'instance_id', 'content_id', 'description', 'files'];
  contentCollection.fetch({ search: params, fields: wantedFields, page_size: 10 }).then((data) => {
    const nodes = data[0].results;
    const topics = nodes.filter((node) => node.kind === 'topic');
    const contents = nodes.filter((node) => node.kind !== 'topic');
    dispatch('SET_SEARCH_TOPICS', topics);
    dispatch('SET_SEARCH_CONTENTS', contents);
  });
};

module.exports = {
  fetchFullContent,
  fetchNodes,
  searchNodes,
};
