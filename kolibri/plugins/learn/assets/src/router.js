
const Vue = require('vue');
const VueRouter = require('vue-router');

Vue.use(VueRouter);

const router = new VueRouter({
  history: false, // do not use the HTML5 history API
});

router.map({
  '/explore': {
    component: require('./vue/topic-page'),
  },
  '/recommendations': {
    component: require('./vue/recs-page'),
  },
  '/content': {
    component: require('./vue/content-page'),
  },
});

router.redirect({
  '/': '/explore',
});

module.exports = router;
