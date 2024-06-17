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
      entry: './assets/src/views/DeviceManagementSideNavEntry.js',
    },
  },
  {
    bundle_id: 'users_app',
    webpack_config: {
      entry: './assets/src/users/app.js',
    },
  },
  {
    bundle_id: 'users_side_nav',
    webpack_config: {
      entry: './assets/src/users/views/UsersSideNavEntry.js',
    },
  },
];
