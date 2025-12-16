module.exports = [
  {
    bundle_id: 'app',
    webpack_config: {
      entry: './frontend/app.js',
    },
  },
  {
    bundle_id: 'side_nav',
    webpack_config: {
      entry: './frontend/views/LearnSideNavEntry.js',
    },
  },
  {
    bundle_id: 'my_downloads_app',
    webpack_config: {
      entry: './frontend/my_downloads/app.js',
    },
  },
  {
    bundle_id: 'my_downloads_side_nav',
    webpack_config: {
      entry: './frontend/my_downloads/views/MyDownloadsSideNavEntry.js',
    },
  },
];
