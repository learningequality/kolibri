module.exports = [
  {
    bundle_id: 'app',
    webpack_config: {
      entry: './assets/src/app.js',
    },
  },
  {
    bundle_id: 'login_side_nav',
    webpack_config: {
      entry: './assets/src/views/LoginSideNavEntry.js',
    },
  },
  {
    bundle_id: 'logout_side_nav',
    webpack_config: {
      entry: './assets/src/views/LogoutSideNavEntry.js',
    },
  },
];
