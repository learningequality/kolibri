module.exports = [
  {
    bundle_id: 'app',
    webpack_config: {
      entry: './assets/src/app.js',
    },
  },
  {
    bundle_id: 'side_nav',
    webpack_config: {
      entry: './assets/src/views/CoachSideNavEntry.vue',
    },
  },
];
