
const Vue = require('vue');
const VueRouter = require('vue-router');

Vue.use(VueRouter);

const router = new VueRouter({
  history: false, // do not use the HTML5 history API
});

router.map({
  '/explore': {
    component: require('./vue/explore-page'),
  },
  '/learn': {
    component: require('./vue/learn-page'),
  },
  '/explore/content': {
    component: require('./vue/explore-page/content-page'),
  },
  '/learn/content': {
    component: require('./vue/learn-page/content-page'),
  },
});

router.redirect({
  '/': '/explore',
});

module.exports = router;
