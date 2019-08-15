module.exports = [
  {
    bundle_id: 'device_management_module',
    webpack_config: {
      entry: './assets/src/app.js',
    },
  },
  {
    bundle_id: 'device_management_side_nav',
    webpack_config: {
      entry: './assets/src/views/DeviceManagementSideNavEntry.vue',
    },
  },
];
