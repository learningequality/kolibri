module.exports = [
  {
    bundle_id: 'app',
    webpack_config: {
      entry: './frontend/app.js',
    },
  },
  {
    bundle_id: 'login_side_nav',
    webpack_config: {
      entry: './frontend/views/LoginSideNavEntry.js',
    },
  },
];
