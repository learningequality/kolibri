<template>

  <div>
    <h1>No Content Channels Available</h1>
    <p v-if="isAdminOrSuperuser">Download content channels from the <a href="/management/#!/content">Content Management</a> page</p>
    <p v-else>You need to log in as an administrator to manage your content channels.</p>
  </div>

</template>


<script>

  const UserKinds = require('core-constants').UserKinds;

  module.exports = {

    computed: {
      isAdminOrSuperuser() {
        if (this.kind[0] === UserKinds.SUPERUSER || this.kind[0] === UserKinds.ADMIN) {
          return true;
        }
        return false;
      },
    },
    vuex: {
      getters: {
        kind: state => state.core.session.kind,
      },
    },
};

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

</style>
