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
      entry: './assets/src/views/LearnSideNavEntry.js',
    },
  },
  {
    bundle_id: 'my_downloads_app',
    webpack_config: {
      entry: './assets/src/my_downloads/app.js',
    },
  },
  {
    bundle_id: 'my_downloads_side_nav',
    webpack_config: {
      entry: './assets/src/my_downloads/views/MyDownloadsSideNavEntry.js',
    },
  },
];
