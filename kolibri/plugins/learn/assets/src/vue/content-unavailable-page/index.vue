<template>

  <div>
    <h1>{{ $tr('header') }}</h1>
    <p v-if="isAdminOrSuperuser">{{{ $trHtml('adminLink') }}}</p>
    <p v-else>{{ $tr('notAdmin') }}</p>
  </div>

</template>


<script>

  const UserKinds = require('kolibri.coreVue.vuex.constants').UserKinds;

  module.exports = {

    $trNameSpace: 'learnContentUnavailable',
    $trs: {
      header: 'No Content Channels Available',
      adminLink: 'Download content channels from the <a href="/management/#!/content">Content Management</a> page', // eslint-disable-line max-len
      notAdmin: 'You need to log in as an administrator to manage your content channels.',
    },

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

  @require '~kolibri.styles.coreTheme'

</style>
