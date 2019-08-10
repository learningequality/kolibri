module.exports = [
  {
    bundle_id: 'learn_module',
    webpack_config: {
      entry: './assets/src/app.js',
    },
  },
  {
    bundle_id: 'learn_module_side_nav',
    webpack_config: {
      entry: './assets/src/views/LearnSideNavEntry.vue',
    },
  },
];
