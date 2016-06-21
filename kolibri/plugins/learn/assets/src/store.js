
const Vue = require('vue');
const Vuex = require('vuex');
Vue.use(Vuex);


function initialState() {
  return {
    // breadcrumbs: require('./demo/breadcrumbs.json'),
    // topics: require('./demo/graphing__topics_only.json'),
    // contents: require('./demo/inequalities__content_only.json'),
    // recommended: require('./demo/content_recommendation_data.json'),
    // full: require('./demo/video__full_metadata.json'),
  };
}

const mutations = {};

module.exports = new Vuex.Store({
  state: initialState(),
  mutations,
});
