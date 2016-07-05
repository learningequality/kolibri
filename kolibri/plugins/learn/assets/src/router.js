
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
  '/learn': {
    component: require('./vue/learn-page'),
    name: 'learn-page',
  },
  '/explore/content': {
    component: require('./vue/content-page'),
    name: 'explore-content',
  },
  '/learn/content': {
    component: require('./vue/content-page'),
    name: 'learn-content',
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
