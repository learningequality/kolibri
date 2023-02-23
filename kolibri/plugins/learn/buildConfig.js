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
      entry: './assets/src/views/LearnSideNavEntry.vue',
    },
  },
  {
    bundle_id: 'my_downloads_side_nav',
    webpack_config: {
      entry: './assets/src/views/MyDownloadsSideNavEntry.vue',
    },
  },
];
