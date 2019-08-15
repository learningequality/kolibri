module.exports = [
  {
    bundle_id: 'coach_module',
    webpack_config: {
      entry: './assets/src/app.js',
    },
  },
  {
    bundle_id: 'coach_side_nav',
    webpack_config: {
      entry: './assets/src/views/CoachSideNavEntry.vue',
    },
  },
];
