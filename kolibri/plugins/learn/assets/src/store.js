const Vuex = require('vuex');

function initialState() {
  return {
    topics: [],
    contents: [],
    full: {
      title: '',
      description: '',
      kind: '',
      files: [],
      pk: 0,
      available: false,
      extra_fields: '{}',
      content_id: '',
    },
    channel: 'dummy_db',
    searchcontents: [],
    searchtopics: [],
    searchtoggled: false,
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
    state.channelId = channelId;
  },
  SET_TOPICS(state, topics) {
    state.topics = topics;
  },
  SET_CONTENTS(state, contents) {
    state.contents = contents;
  },
  SET_SEARCH_CONTENTS(state, contents) {
    state.searchcontents = contents; // eslint-disable-line no-param-reassign
  },
  SET_SEARCH_TOPICS(state, topics) {
    state.searchtopics = topics; // eslint-disable-line no-param-reassign
  },
  SET_SEARCH_TOGGLED(state, toggled) {
    state.searchtoggled = toggled; // eslint-disable-line no-param-reassign
  },
};

module.exports = new Vuex.Store({
  state: initialState(),
  mutations,
});
