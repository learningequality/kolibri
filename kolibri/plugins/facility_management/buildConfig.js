module.exports = [
  {
    bundle_id: 'facility_management_module',
    webpack_config: {
      entry: './assets/src/app.js',
    },
  },
  {
    bundle_id: 'facility_management_side_nav',
    webpack_config: {
      entry: './assets/src/views/FacilityManagementSideNavEntry.vue',
    },
  },
];
