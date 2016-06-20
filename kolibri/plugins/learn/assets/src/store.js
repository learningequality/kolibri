
const Vuex = require('vuex');

function initialState() {
  return {
    breadcrumbs: require('./demo-data/breadcrumbs.json'),
    topics: require('./demo-data/graphing__topics_only.json'),
    contents: require('./demo-data/inequalities__content_only.json'),
    recommended: require('./demo-data/content_recommendation_data.json'),
    full: require('./demo-data/video__full_metadata.json'),
    channel: 'khan',
  };
}

const mutations = {
  /**
   * Mutation to set all the attributes of a content item retrieved from the server onto
   *  the 'full' key on the Store state.
   * @param {Object} state - A Vuex state object.
   * @param {Object} attributes - The object of key value pairs for the content node.
   * @constructor
   */
  SET_FULL_CONTENT(state, attributes) {
    Object.assign(state.full, attributes);
  },
  SET_CHANNEL(state, channelId) {
    state.channelId = channelId; // eslint-disable-line no-param-reassign
  },
};

module.exports = new Vuex.Store({
  state: initialState(),
  mutations,
});
