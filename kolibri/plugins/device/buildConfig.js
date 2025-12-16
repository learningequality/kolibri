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
      entry: './frontend/views/DeviceManagementSideNavEntry.js',
    },
  },
];
