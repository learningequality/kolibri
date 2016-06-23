
const Vue = require('vue');
const Vuex = require('vuex');
Vue.use(Vuex);


function initialState() {
  return {
    breadcrumbs: require('./demo-data/breadcrumbs.json'),
    topics: require('./demo-data/graphing__topics_only.json'),
    contents: require('./demo-data/inequalities__content_only.json'),
    recommended: require('./demo-data/content_recommendation_data.json'),
    full: require('./demo-data/video__full_metadata.json'),
  };
}

const mutations = {};

module.exports = new Vuex.Store({
  state: initialState(),
  mutations,
});
