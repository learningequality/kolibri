
const Vue = require('vue');
const VueRouter = require('vue-router');

Vue.use(VueRouter);

const router = new VueRouter({
  history: false, // do not use the HTML5 history API
});

router.map({
  '/explore': {
    component: require('./vue/explore-page'),
    name: 'explore-page',
  },
  '/explore/topic/:content_id': {
    component: require('./vue/explore-page'),
    name: 'explore-topic-page',
  },
  '/explore/content/:content_id': {
    component: require('./vue/content-page'),
    name: 'explore-content',
  },
  '/learn': {
    component: require('./vue/learn-page'),
    name: 'learn-page',
  },
  '/scratchpad': {
    component: require('./vue/scratchpad'),
    name: 'scratchpad',
  },
});

router.redirect({
  '/': '/explore',
});

module.exports = router;
