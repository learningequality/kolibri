<template>

  <div>
    <h1>No Content Channels Available</h1>
    <p v-if="isAdminOrSuperuser">Download content channels from the <a href="/management/">Manage Content Page.</a></p>
    <p v-else>You need to log in as an administrator to manage your content channels.</p>
  </div>

</template>


<script>

  module.exports = {
    vuex: {
      getters: {
        isAdminOrSuperuser: state => state.core.is_admin_or_superuser,
      },
    },
};

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

</style>
