module.exports = [
  {
    bundle_id: 'user_module',
    webpack_config: {
      entry: './assets/src/app.js',
    },
  },
  {
    bundle_id: 'user_module_login_nav_side_nav',
    webpack_config: {
      entry: './assets/src/views/LoginSideNavEntry.vue',
    },
  },
  {
    bundle_id: 'user_module_user_profile_nav_side_nav',
    webpack_config: {
      entry: './assets/src/views/UserProfileSideNavEntry.vue',
    },
  },
];
